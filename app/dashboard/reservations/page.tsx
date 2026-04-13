"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { reservationsApi, Reservation } from "@/lib/api/reservations";
import { blocksApi, Block } from "@/lib/api/blocks";
import { blockAssignmentsApi, BlockAssignment } from "@/lib/api/block-assignments";
import { tablesApi, Table } from "@/lib/api/tables";
import { authApi } from "@/lib/api/auth";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReservationDialog } from "@/components/reservation-dialog";
import { LoadingOverlay } from "@/components/loading-overlay";
import { SkeletonReservationCard } from "@/components/skeletons";
import { DropdownSelector } from "@/components/area-selector";
import { format, parseISO, startOfDay, endOfDay, isToday } from "date-fns";
import { de } from "date-fns/locale";
import { Ban, Calendar, Check, CheckCircle, ChevronDown, Clock, Filter, LayoutGrid, Users, XCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";

type ReservationFilter = Reservation["status"] | "block";
const RESERVATION_STATUSES: Reservation["status"][] = [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "canceled",
  "no_show",
];
const ALL_FILTERS: ReservationFilter[] = [...RESERVATION_STATUSES, "block"];
const STATUS_SETTINGS_KEY = "reservations_status_filters";
const normalizeStatus = (value: string): ReservationFilter | null => {
  const normalized = value === "noShow" ? "no_show" : value;
  if (normalized === "block") return "block";
  return RESERVATION_STATUSES.includes(normalized as Reservation["status"])
    ? (normalized as Reservation["status"])
    : null;
};
const normalizeStatusList = (values: any): ReservationFilter[] => {
  if (!Array.isArray(values)) return [];
  const unique = new Set<ReservationFilter>();
  values.forEach((v) => {
    const n = normalizeStatus(v);
    if (n) unique.add(n);
  });
  return Array.from(unique);
};

type StatusMeta = { Icon: typeof Clock; tone: string };

const STATUS_ICON_MAP: Record<ReservationFilter, StatusMeta> = {
  pending: { Icon: Clock, tone: "bg-blue-900/40 border-blue-600 text-black dark:text-blue-100" },
  confirmed: { Icon: CheckCircle, tone: "bg-indigo-900/40 border-indigo-600 text-black dark:text-indigo-100" },
  seated: { Icon: Users, tone: "bg-emerald-900/40 border-emerald-600 text-black dark:text-emerald-100" },
  completed: { Icon: CheckCircle, tone: "bg-amber-900/30 border-amber-600 text-black dark:text-amber-100" },
  canceled: { Icon: XCircle, tone: "bg-red-900/30 border-red-600 text-black dark:text-red-100" },
  no_show: { Icon: XCircle, tone: "bg-orange-900/30 border-orange-600 text-black dark:text-orange-100" },
  block: { Icon: Ban, tone: "bg-rose-900/40 border-rose-600 text-black dark:text-rose-100" },
};

export default function ReservationsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockAssignments, setBlockAssignments] = useState<BlockAssignment[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reservationSearchQuery, setReservationSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<ReservationFilter[]>(ALL_FILTERS);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; variant?: "info" | "error" | "success" }[]>([]);
  const [now, setNow] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const settingsInitializedRef = useRef(false);
  const lastPersistedStatusesRef = useRef<string>("");
  const { settings, updateSettings, error: settingsError } = useUserSettings();

  const addToast = useCallback(
    (message: string, variant: "info" | "error" | "success" = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  useEffect(() => {
    if (!settingsError) return;
    addToast(settingsError, "error");
  }, [settingsError, addToast]);

  useEffect(() => {
    if (settingsInitializedRef.current || !settings) return;
    const stored = (settings.settings || {})[STATUS_SETTINGS_KEY];
    const normalized = normalizeStatusList(stored);
    if (normalized.length > 0) {
      setSelectedStatuses(normalized);
      lastPersistedStatusesRef.current = JSON.stringify(normalized);
    }
    settingsInitializedRef.current = true;
  }, [settings]);

  const persistStatusFilter = useCallback(
    async (statuses: ReservationFilter[]) => {
      const normalized = normalizeStatusList(statuses);
      const serialized = JSON.stringify(normalized);
      if (serialized === lastPersistedStatusesRef.current) return;
      // Speichere sofort, um parallele Aufrufe mit gleicher Payload zu verhindern
      lastPersistedStatusesRef.current = serialized;
      try {
        await updateSettings({ [STATUS_SETTINGS_KEY]: normalized });
      } catch (err) {
        console.error("Fehler beim Speichern der Filtereinstellungen:", err);
        addToast("Filter konnten nicht gespeichert werden.", "error");
        // Rollback des Guards, damit ein erneuter Versuch mçglicht ist
        lastPersistedStatusesRef.current = "";
      }
    },
    [updateSettings, addToast]
  );

  useEffect(() => {
    const loadInitialRestaurant = async () => {
      try {
        // We set initial loading true here, but the second useEffect will handle the loading state for reservations.
        setIsInitialLoading(true);
        const user = await authApi.getCurrentUser();
        const restaurantsData = await restaurantsApi.list();
        if (restaurantsData.length > 0) {
          const preferredRestaurant =
            user.tenant_id != null
              ? restaurantsData.find((restaurant) => restaurant.id === user.tenant_id)
              : null;
          setRestaurant(preferredRestaurant ?? restaurantsData[0]);
        } else {
          // If no restaurant, we can stop loading.
          setIsInitialLoading(false);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Restaurants:", err);
        setIsInitialLoading(false);
      }
    };

    loadInitialRestaurant();

    const interval = setInterval(() => setNow(new Date()), 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // This useEffect is now the single source of truth for loading reservation data.
  // It runs whenever the restaurant is loaded for the first time, or when the selectedDate changes.
  useEffect(() => {
    const loadReservationData = async () => {
      if (!restaurant) return; // Don't run if the restaurant hasn't been loaded yet.

      try {
        setIsRefreshing(true);
        const [tablesData, reservationsData, blocksData, assignmentsData] = await Promise.all([
          tablesApi.list(restaurant.id),
          reservationsApi.list(restaurant.id, {
            from: startOfDay(selectedDate).toISOString(),
            to: endOfDay(selectedDate).toISOString(),
          }),
          blocksApi.list(restaurant.id),
          blockAssignmentsApi.list(restaurant.id),
        ]);
        setTables(tablesData);
        setReservations(
          reservationsData.sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime())
        );
        setBlocks(blocksData);
        setBlockAssignments(assignmentsData);
      } catch (err) {
        console.error("Fehler beim Laden der Reservierungen:", err);
      } finally {
        setIsRefreshing(false);
        setIsInitialLoading(false); // We are done with all initial loading at this point.
      }
    };

    loadReservationData();
  }, [restaurant, selectedDate]);


  const loadData = async (background = false) => {
     if (!restaurant) return;

    try {
      background ? setIsRefreshing(true) : setIsInitialLoading(true);

      const [tablesData, reservationsData, blocksData, assignmentsData] = await Promise.all([
        tablesApi.list(restaurant.id),
        reservationsApi.list(restaurant.id, {
          from: startOfDay(selectedDate).toISOString(),
          to: endOfDay(selectedDate).toISOString(),
        }),
        blocksApi.list(restaurant.id),
        blockAssignmentsApi.list(restaurant.id),
      ]);
      setTables(tablesData);
      setReservations(
        reservationsData.sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime())
      );
      setBlocks(blocksData);
      setBlockAssignments(assignmentsData);
    } catch (err) {
      console.error("Fehler beim Laden der Reservierungen:", err);
    } finally {
      background ? setIsRefreshing(false) : setIsInitialLoading(false);
    }
  };

  const filteredReservations = useMemo(() => {
    let items = reservations;
    
    const reservationStatuses = selectedStatuses.filter((status): status is Reservation["status"] => status !== "block");
    const statusesToUse =
      reservationStatuses.length > 0
        ? reservationStatuses
        : selectedStatuses.length === 0
        ? RESERVATION_STATUSES
        : [];
    items = items.filter((r) => statusesToUse.includes(r.status));

    if (selectedTableId) {
      items = items.filter((r) => r.table_id === selectedTableId);
    }

    const query = reservationSearchQuery.trim().toLowerCase();
    if (query) {
      items = items.filter((r) => {
        const haystack = [r.guest_name, r.guest_email, r.guest_phone, r.notes]
          .filter(Boolean)
          .map((v) => v!.toLowerCase())
          .join(" ");
        return haystack.includes(query);
      });
    }

    return items;
  }, [reservations, reservationSearchQuery, selectedStatuses, selectedTableId]);

  const showBlocks = selectedStatuses.length === 0 || selectedStatuses.includes("block");
  const blockTableNumbers = useMemo(() => {
    const map = new Map<string, string[]>();
    blockAssignments.forEach((assignment) => {
      if (!assignment.table_id) return;
      const table = tables.find((item) => item.id === assignment.table_id);
      if (!table) return;
      const list = map.get(assignment.block_id) ?? [];
      list.push(table.number);
      map.set(assignment.block_id, list);
    });
    map.forEach((list, blockId) => {
      map.set(
        blockId,
        [...list].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      );
    });
    return map;
  }, [blockAssignments, tables]);

  const blocksForDayAll = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    return blocks.filter((block) => {
      const start = parseISO(block.start_at);
      const end = parseISO(block.end_at);
      return start < dayEnd && end > dayStart;
    });
  }, [blocks, selectedDate]);

  const filteredBlocks = useMemo(() => {
    if (!showBlocks) return [];
    let items = blocksForDayAll;

    if (isToday(selectedDate)) {
      items = items.filter((block) => parseISO(block.end_at) >= now);
    }

    if (selectedTableId) {
      const assignedBlockIds = new Set(
        blockAssignments
          .filter((assignment) => assignment.table_id === selectedTableId)
          .map((assignment) => assignment.block_id)
      );
      items = items.filter(
        (block) => block.table_id === selectedTableId || assignedBlockIds.has(block.id)
      );
    }

    const query = reservationSearchQuery.trim().toLowerCase();
    if (query) {
      items = items.filter((block) => (block.reason || "").toLowerCase().includes(query));
    }

    return items;
  }, [blocksForDayAll, blockAssignments, reservationSearchQuery, selectedDate, selectedTableId, now, showBlocks]);

  const combinedItems = useMemo(() => {
    const items = [
      ...filteredReservations.map((reservation) => ({
        type: "reservation" as const,
        id: `reservation-${reservation.id}`,
        start_at: reservation.start_at,
        reservation,
      })),
      ...filteredBlocks.map((block) => ({
        type: "block" as const,
        id: `block-${block.id}`,
        start_at: block.start_at,
        block,
      })),
    ];
    return items.sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime());
  }, [filteredReservations, filteredBlocks]);

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    const table = reservation.table_id ? tables.find((t) => t.id === reservation.table_id) ?? null : null;
    setSelectedTable(table);
    setReservationDialogOpen(true);
  };

  const handleReservationCreated = async () => {
    await loadData(true);
  };

  const handleReservationUpdated = async () => {
    await loadData(true);
  };

  const handleBlockCreated = async () => {
    await loadData(true);
  };

  const navigateDate = (days: number) => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  const getTableName = (tableId: string | null) => {
    if (!tableId) return "Ohne Nummer";
    const table = tables.find((t) => t.id === tableId);
    return table ? `${table.number}` : "Unbekannt";
  };
  const tableFilterOptions = [
    { id: "__all__", label: "Alle Tische" },
    ...[...tables]
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
      .map((tableOption) => ({ id: tableOption.id, label: tableOption.number })),
  ];

  const getStatusLabel = (status: ReservationFilter) => {
    if (status === "block") return "Block";
    switch (status) {
      case "confirmed":
        return "Bestätigt";
      case "seated":
        return "Platziert";
      case "completed":
        return "Abgeschlossen";
      case "canceled":
        return "Storniert";
      case "no_show":
        return "No-Show";
      default:
        return "Ausstehend";
    }
  };

  const getStatusIcon = (status: Reservation["status"]) => {
    const entry = STATUS_ICON_MAP[status] || STATUS_ICON_MAP.pending;
    return {
      icon: <entry.Icon className="w-4 h-4" />,
      className: `inline-flex items-center justify-center w-8 h-8 rounded-md border ${entry.tone}`,
      label: getStatusLabel(status),
    };
  };

  const getBlockTableLabel = (blockId: string) => {
    const entries = blockTableNumbers.get(blockId);
    if (!entries || entries.length === 0) return "Ohne Tisch";
    return entries.length === 1 ? `Tisch ${entries[0]}` : `Tische ${entries.join(", ")}`;
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Header Skeleton */}
        <div className="bg-card border-b border-border px-4 py-3 shadow-sm">
          <div className="h-24" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            <SkeletonReservationCard count={10} />
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Kein Restaurant gefunden.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.35)] text-sm ${
                toast.variant === "error"
                  ? "bg-red-900/80 border-red-500 text-red-50"
                  : toast.variant === "success"
                  ? "bg-green-900/80 border-green-500 text-green-50"
                  : "bg-slate-800/90 border-slate-600 text-slate-100"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
      <div className="bg-card border-b border-border px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="text-left">
              <div className="text-xs md:text-sm font-semibold text-foreground whitespace-nowrap">
                {format(now, "EEEE, d. MMMM yyyy", { locale: de })}
              </div>
              <div className="text-base md:text-lg lg:text-xl font-bold text-primary tracking-tight whitespace-nowrap">
                {format(now, "HH:mm:ss")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0 shrink-0 justify-end">
            <div className="text-right leading-tight">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Ausgewählter Tag</div>
              <div className="text-xs font-semibold text-foreground whitespace-nowrap">
                {format(selectedDate, "EEE, d.M.yyyy", { locale: de })}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate(-1)}
                    className="touch-manipulation min-h-[32px] px-2 py-1"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                    className="touch-manipulation min-h-[32px] text-xs px-2 py-1 gap-1.5"
                    title="Heute springen"
                >
                    <Calendar className="w-3.5 h-3.5" />
                    Heute
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate(1)}
                    className="touch-manipulation min-h-[32px] px-2 py-1"
                    title="Nächster Tag"
                >
                    <ChevronRight className="w-3.5 h-3.5" />
                </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_14rem_14rem] gap-4 mt-4 items-start">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Suche nach Name, E-Mail, Telefon..."
              value={reservationSearchQuery}
              onChange={(e) => setReservationSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-input text-foreground placeholder-muted-foreground"
            />
          </div>
          <DropdownSelector
            options={tableFilterOptions}
            selectedId={selectedTableId ?? "__all__"}
            onSelect={(value) => setSelectedTableId(value === "__all__" ? null : value)}
            placeholder="Alle Tische"
            triggerClassName="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm shadow-inner flex items-center justify-between gap-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] touch-manipulation"
            menuAlign="right"
            menuWidthClassName="w-56"
            menuClassName="max-h-[70vh] overflow-auto"
            zIndexClassName="z-[50]"
            renderSelected={(selected) => (
              <div className="flex items-center gap-2 min-w-0">
                <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{selected?.label ?? "Alle Tische"}</span>
              </div>
            )}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusMenuOpen((prev) => !prev)}
              className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm shadow-inner flex items-center justify-between gap-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] touch-manipulation"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">
                  {selectedStatuses.length === ALL_FILTERS.length || selectedStatuses.length === 0
                    ? "Alle Status"
                    : selectedStatuses.map((s) => getStatusLabel(s)).join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="px-2 py-1 rounded-md bg-muted text-xs">{combinedItems.length}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {statusMenuOpen && (
              <div className="absolute left-0 mt-1 w-56 rounded-lg border border-border bg-background shadow-xl z-[50] max-h-[70vh] overflow-auto">
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedStatuses.length === ALL_FILTERS.length || selectedStatuses.length === 0 ? [] : ALL_FILTERS;
                    setSelectedStatuses(next);
                    void persistStatusFilter(next);
                  }}
                  className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                    selectedStatuses.length === ALL_FILTERS.length || selectedStatuses.length === 0
                      ? "font-semibold text-foreground border-l-2 border-primary bg-accent"
                      : "text-foreground hover:bg-card"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-white/10 bg-black/10">
                      <Filter className="w-4 h-4" />
                    </span>
                    Alle Status
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-card">{reservations.length + blocksForDayAll.length}</span>
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${
                        selectedStatuses.length === ALL_FILTERS.length || selectedStatuses.length === 0
                          ? "border-white/60 bg-white/10"
                          : "border-border bg-card"
                      }`}
                    >
                      {(selectedStatuses.length === ALL_FILTERS.length || selectedStatuses.length === 0) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </span>
                  </div>
                </button>
                {ALL_FILTERS.map((status) => {
                  const active = selectedStatuses.includes(status);
                  const label = getStatusLabel(status);
                  const count =
                    status === "block"
                      ? blocksForDayAll.length
                      : reservations.filter((r) => r.status === status).length;
                  const { Icon, tone } = STATUS_ICON_MAP[status];
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setSelectedStatuses((prev) => {
                          const next = prev.includes(status)
                            ? prev.filter((s) => s !== status)
                            : [...prev, status];
                          const cleaned = next.length === 0 ? [] : next;
                          void persistStatusFilter(cleaned);
                          return cleaned;
                        });
                      }}
                      className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                        active
                          ? "font-semibold text-foreground border-l-2 border-primary bg-accent hover:bg-muted/80"
                          : "text-foreground hover:bg-card"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-md border shrink-0 ${
                            active ? tone : "border-white/10 bg-black/10 text-foreground"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? "text-foreground dark:text-current" : ""}`} />
                        </span>
                        <span className="capitalize">{label}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full text-xs bg-card">{count}</span>
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${
                            active ? "border-white/60 bg-white/10" : "border-border bg-card"
                          }`}
                        >
                          {active && <Check className="w-4 h-4 text-primary" />}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-background">
        <div className="p-4 space-y-4">
          {combinedItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg">
                Keine Einträge für den {format(selectedDate, "d. MMMM yyyy", { locale: de })}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[1120px] text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Zeit</th>
                    <th className="px-4 py-3 font-medium">Typ</th>
                    <th className="px-4 py-3 font-medium">Name / Grund</th>
                    <th className="px-4 py-3 font-medium">Tisch</th>
                    <th className="px-4 py-3 font-medium text-right">Personen</th>
                    <th className="px-4 py-3 font-medium">Kontakt</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Notizen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {combinedItems.map((entry) => {
                    if (entry.type === "block") {
                      const block = entry.block;
                      const startDate = parseISO(block.start_at);
                      const endDate = parseISO(block.end_at);
                      const blockMeta = STATUS_ICON_MAP.block;
                      const BlockIcon = blockMeta.Icon;
                      return (
                        <tr key={entry.id} className="bg-rose-900/10 text-foreground">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {format(startDate, "HH:mm")}–{format(endDate, "HH:mm")}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md border border-rose-600/60 bg-rose-900/20 px-2 py-1 text-xs font-medium">
                              Block
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {block.reason || "Blockiert"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{getBlockTableLabel(block.id)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">-</td>
                          <td className="px-4 py-3 text-muted-foreground">-</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${blockMeta.tone}`}>
                              <BlockIcon className="w-3.5 h-3.5" />
                              Blockiert
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">-</td>
                        </tr>
                      );
                    }

                    const reservation = entry.reservation;
                    const startDate = parseISO(reservation.start_at);
                    const endDate = parseISO(reservation.end_at);
                    const status = getStatusIcon(reservation.status);
                    const contact = [reservation.guest_phone, reservation.guest_email]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => handleReservationClick(reservation)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleReservationClick(reservation);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {format(startDate, "HH:mm")}–{format(endDate, "HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md border border-border bg-background/50 px-2 py-1 text-xs font-medium">
                            Reservierung
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground">
                            {reservation.guest_name || "Unbekannt"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{getTableName(reservation.table_id)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {reservation.party_size}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{contact || "-"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`${status.className} inline-flex w-auto px-2 py-1 gap-1.5`}
                            title={status.label}
                            aria-label={status.label}
                          >
                            {status.icon}
                            <span className="text-xs font-medium">{status.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="block max-w-[280px] truncate">
                            {reservation.notes || "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {restaurant && (
        <ReservationDialog
          open={reservationDialogOpen}
          onOpenChange={setReservationDialogOpen}
          restaurantId={restaurant.id}
          table={selectedTable}
          selectedDate={selectedReservation ? parseISO(selectedReservation.start_at) : new Date()}
          reservation={selectedReservation}
          onReservationCreated={handleReservationCreated}
          onReservationUpdated={handleReservationUpdated}
          onBlockCreated={handleBlockCreated}
          availableTables={tables}
          onNotify={addToast}
          readOnly={true}
        />
      )}
    </div>
  );
}
