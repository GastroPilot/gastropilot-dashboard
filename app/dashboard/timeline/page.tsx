"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { areasApi, Area } from "@/lib/api/areas";
import { tablesApi, Table } from "@/lib/api/tables";
import { reservationsApi, Reservation } from "@/lib/api/reservations";
import { blocksApi, Block } from "@/lib/api/blocks";
import { blockAssignmentsApi, BlockAssignment } from "@/lib/api/block-assignments";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/loading-overlay";
import { format, parseISO, startOfDay, endOfDay, addMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { Ban, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Filter } from "lucide-react";
import { ReservationDialog } from "@/components/reservation-dialog";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { DropdownSelector } from "@/components/area-selector";

const BASE_SLOT_MINUTES = 30;
const BASE_SLOT_WIDTH = 56; // px per 30-min slot for horizontal spacing
const LANE_HEIGHT = 44; // px height per lane for overlapping reservations
type TimelineFilter = Reservation["status"] | "block";
const STATUS_STYLE: Record<Reservation["status"], { className: string; label: string }> = {
  pending: { className: "bg-rose-600/85 border border-rose-400/70 text-white", label: "Offen" },
  confirmed: { className: "bg-emerald-600/85 border border-emerald-400/70 text-white", label: "Bestätigt" },
  seated: { className: "bg-amber-600/90 border border-amber-300/70 text-white", label: "Platziert" },
  completed: { className: "bg-slate-600/85 border border-slate-400/70 text-white", label: "Abgeschlossen" },
  canceled: { className: "bg-gray-600/80 border border-gray-400/70 text-white", label: "Storniert" },
  no_show: { className: "bg-gray-700/80 border border-gray-500/70 text-white", label: "No Show" },
};
const STATUS_ICON_MAP: Record<
  TimelineFilter,
  { Icon: typeof Clock; tone: string }
> = {
  pending: { Icon: Clock, tone: "bg-blue-900/40 border-blue-600 text-blue-100" },
  confirmed: { Icon: Clock, tone: "bg-emerald-900/40 border-emerald-600 text-emerald-100" },
  seated: { Icon: Clock, tone: "bg-amber-900/40 border-amber-600 text-amber-100" },
  completed: { Icon: Clock, tone: "bg-slate-900/40 border-slate-600 text-slate-100" },
  canceled: { Icon: Clock, tone: "bg-red-900/40 border-red-600 text-red-100" },
  no_show: { Icon: Clock, tone: "bg-orange-900/30 border-orange-600 text-orange-100" },
  block: { Icon: Ban, tone: "bg-rose-900/40 border-rose-600 text-rose-100" },
};
const ACTIVE_STATUSES: Reservation["status"][] = ["pending", "confirmed", "seated"];
const ALL_STATUSES: Reservation["status"][] = [
  "pending",
  "confirmed",
  "seated",
  "completed",
  "canceled",
  "no_show",
];
const ACTIVE_FILTERS: TimelineFilter[] = [...ACTIVE_STATUSES, "block"];
const ALL_FILTERS: TimelineFilter[] = [...ALL_STATUSES, "block"];
const STATUS_SETTINGS_KEY = "dashboard_status_filters";
const SLOT_SETTINGS_KEY = "dashboard_timeline_slot_minutes";
const normalizeStatus = (value: string): TimelineFilter | null => {
  const normalized = value === "noShow" ? "no_show" : value;
  if (normalized === "block") return "block";
  return ALL_STATUSES.includes(normalized as Reservation["status"])
    ? (normalized as Reservation["status"])
    : null;
};
const normalizeStatusList = (values: any): TimelineFilter[] => {
  if (!Array.isArray(values)) return [];
  const unique = new Set<TimelineFilter>();
  values.forEach((v) => {
    const n = normalizeStatus(v);
    if (n) unique.add(n);
  });
  return Array.from(unique);
};

export default function TimelinePage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockAssignments, setBlockAssignments] = useState<BlockAssignment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [now, setNow] = useState<Date>(new Date());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; variant?: "info" | "error" | "success" }[]>([]);
  const [slotMinutes, setSlotMinutes] = useState<number>(60);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<TimelineFilter[]>(ACTIVE_FILTERS);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsInitializedRef = useRef(false);
  const lastPersistedStatusesRef = useRef<string>("");
  const slotInitializedRef = useRef(false);
  const lastPersistedSlotRef = useRef<number | null>(null);
  const { settings, updateSettings, error: settingsError } = useUserSettings();

  const addToast = useCallback(
    (message: string, variant: "info" | "error" | "success" = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  useEffect(() => {
    const loadInitialRestaurant = async () => {
      try {
        setIsInitialLoading(true);
        const restaurantsData = await restaurantsApi.list();
        if (restaurantsData.length > 0) {
          setRestaurant(restaurantsData[0]);
        } else {
          setIsInitialLoading(false);
        }
      } catch (error) {
        console.error("Fehler beim Laden des Restaurants:", error);
        setIsInitialLoading(false);
      }
    };

    loadInitialRestaurant();
    const interval = setInterval(() => setNow(new Date()), 1000);

    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadData = useCallback(
    async (background = false) => {
      if (!restaurant) return;
      const showInitial = !background && !hasLoadedOnce;
      try {
        showInitial ? setIsInitialLoading(true) : setIsRefreshing(true);
        const [areasData, tablesData, blocksData, assignmentsData] = await Promise.all([
          areasApi.list(restaurant.id),
          tablesApi.list(restaurant.id),
          blocksApi.list(restaurant.id),
          blockAssignmentsApi.list(restaurant.id),
        ]);
        setAreas(areasData);
        setTables(tablesData);
        setBlocks(blocksData);
        setBlockAssignments(assignmentsData);

        const from = startOfDay(selectedDate);
        const to = endOfDay(selectedDate);
        const reservationsData = await reservationsApi.list(restaurant.id, {
          from: from.toISOString(),
          to: to.toISOString(),
        });
        setReservations(reservationsData);
      } catch (error) {
        console.error("Fehler beim Laden der Daten:", error);
      } finally {
        showInitial ? setIsInitialLoading(false) : setIsRefreshing(false);
        setHasLoadedOnce(true);
      }
    },
    [restaurant, selectedDate, hasLoadedOnce]
  );

  useEffect(() => {
    if (settingsError) {
      addToast(settingsError, "error");
    }
  }, [settingsError, addToast]);

  useEffect(() => {
    if (settingsInitializedRef.current || !settings) return;
    const stored = (settings.settings || {})[STATUS_SETTINGS_KEY];
    const normalized = normalizeStatusList(stored);
    if (normalized.length > 0) {
      setSelectedStatuses(normalized);
      lastPersistedStatusesRef.current = JSON.stringify(normalized);
    }
    const storedSlot = (settings.settings || {})[SLOT_SETTINGS_KEY];
    if (typeof storedSlot === "number" && (storedSlot === 15 || storedSlot === 30 || storedSlot === 60)) {
      setSlotMinutes(storedSlot);
      lastPersistedSlotRef.current = storedSlot;
    }
    settingsInitializedRef.current = true;
  }, [settings]);

  const persistStatusFilter = useCallback(
    async (statuses: TimelineFilter[]) => {
      const normalized = normalizeStatusList(statuses);
      const serialized = JSON.stringify(normalized);
      if (serialized === lastPersistedStatusesRef.current) return;
      lastPersistedStatusesRef.current = serialized;
      try {
        await updateSettings({ [STATUS_SETTINGS_KEY]: normalized });
      } catch (err) {
        console.error("Fehler beim Speichern der Timeline-Filtereinstellungen:", err);
        addToast("Status-Filter konnten nicht gespeichert werden.", "error");
        lastPersistedStatusesRef.current = "";
      }
    },
    [updateSettings, addToast]
  );

  const persistSlotMinutes = useCallback(
    async (value: number) => {
      if (value === lastPersistedSlotRef.current) return;
      lastPersistedSlotRef.current = value;
      try {
        await updateSettings({ [SLOT_SETTINGS_KEY]: value });
      } catch (err) {
        console.error("Fehler beim Speichern des Zeitrasters:", err);
        addToast("Zeitraster konnte nicht gespeichert werden.", "error");
        lastPersistedSlotRef.current = null;
      }
    },
    [updateSettings, addToast]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const slotWidth = useMemo(() => Math.max(36, Math.round((BASE_SLOT_WIDTH / BASE_SLOT_MINUTES) * slotMinutes)), [slotMinutes]);
  const slotOptions = [15, 30, 60].map((value) => ({
    id: String(value),
    label: `${value} Minuten`,
  }));
  const reservationsForDayAll = useMemo(() => {
    const dayStartDate = startOfDay(selectedDate);
    const dayEndDate = endOfDay(selectedDate);
    return reservations.filter((r) => {
      const start = parseISO(r.start_at);
      const end = parseISO(r.end_at);
      return start < dayEndDate && end > dayStartDate;
    });
  }, [reservations, selectedDate]);

  const reservationsForDay = useMemo(() => {
    const reservationStatuses = selectedStatuses.filter(
      (status): status is Reservation["status"] => status !== "block"
    );
    const statusesToUse =
      reservationStatuses.length > 0
        ? reservationStatuses
        : selectedStatuses.length === 0
        ? ALL_STATUSES
        : [];
    return reservationsForDayAll.filter((r) => statusesToUse.includes(r.status));
  }, [reservationsForDayAll, selectedStatuses]);
  const unassignedReservations = useMemo(
    () => reservationsForDay.filter((r) => !r.table_id),
    [reservationsForDay]
  );
  const unassignedLanes = useMemo(() => {
    const sorted = [...unassignedReservations].sort(
      (a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime()
    );
    const laneEnds: number[] = [];
    const map = new Map<string, number>();
    sorted.forEach((res) => {
      const start = parseISO(res.start_at).getTime();
      const end = parseISO(res.end_at).getTime();
      let laneIndex = laneEnds.findIndex((laneEnd) => start >= laneEnd);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[laneIndex] = end;
      }
      map.set(res.id, laneIndex);
    });
    return { map, laneCount: Math.max(1, laneEnds.length || 1) };
  }, [unassignedReservations]);

  const totalReservations = reservationsForDay.length;
  const showBlocks = selectedStatuses.length === 0 || selectedStatuses.includes("block");
  const blocksForDay = useMemo(() => {
    const dayStartDate = startOfDay(selectedDate);
    const dayEndDate = endOfDay(selectedDate);
    return blocks.filter((block) => {
      const start = parseISO(block.start_at);
      const end = parseISO(block.end_at);
      return start < dayEndDate && end > dayStartDate;
    });
  }, [blocks, selectedDate]);
  const blocksByTable = useMemo(() => {
    const map = new Map<string, Block[]>();
    const blockMap = new Map(blocksForDay.map((block) => [block.id, block]));
    blockAssignments.forEach((assignment) => {
      if (!assignment.table_id) return;
      const block = blockMap.get(assignment.block_id);
      if (!block) return;
      const list = map.get(assignment.table_id) ?? [];
      list.push(block);
      map.set(assignment.table_id, list);
    });
    map.forEach((list) => list.sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime()));
    return map;
  }, [blockAssignments, blocksForDay]);

  const timeSlots = useMemo(() => {
    const slots: { label: string; isHour: boolean }[] = [];
    const start = startOfDay(selectedDate);
    for (let minutes = 0; minutes < 24 * 60; minutes += slotMinutes) {
      const time = addMinutes(start, minutes);
      slots.push({
        label: format(time, "HH:mm"),
        isHour: time.getMinutes() === 0,
      });
    }
    return slots;
  }, [selectedDate, slotMinutes]);

  const timelineWidth = timeSlots.length * slotWidth;
  const dayStart = startOfDay(selectedDate).getTime();
  const dayEnd = endOfDay(selectedDate).getTime();
  const dayDuration = dayEnd - dayStart;

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

  const getStatusLabel = (status: TimelineFilter) => {
    if (status === "block") return "Block";
    return STATUS_STYLE[status]?.label ?? status;
  };

  const reservationsByTable = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    reservationsForDay.forEach((reservation) => {
      if (!reservation.table_id) return;
      const list = map.get(reservation.table_id) ?? [];
      list.push(reservation);
      map.set(reservation.table_id, list);
    });
    map.forEach((list) => list.sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime()));
    return map;
  }, [reservationsForDay]);

  const tablesByArea = useMemo(() => {
    const grouped = new Map<string | "unassigned", Table[]>();
    tables.forEach((table) => {
      const key: string | "unassigned" =
        table.area_id !== null && table.area_id !== undefined
          ? table.area_id
          : "unassigned";
      const list = grouped.get(key) ?? [];
      list.push(table);
      grouped.set(key, list);
    });
    grouped.forEach((list) =>
      list.sort((a, b) => Number(a.number ?? 0) - Number(b.number ?? 0))
    );
    return grouped;
  }, [tables]);

  const areaOrder: (string | "unassigned")[] = useMemo(() => {
    const ids: (string | "unassigned")[] = areas.map((area) => area.id);
    if (tablesByArea.has("unassigned")) ids.push("unassigned");
    return ids;
  }, [areas, tablesByArea]);

  const navigateDate = (delta: number) => {
    setSelectedDate((prev) => addMinutes(prev, delta * 24 * 60));
  };

  const renderReservationBar = (reservation: Reservation, laneIndex = 0) => {
    const start = Math.max(parseISO(reservation.start_at).getTime(), dayStart);
    const end = Math.min(parseISO(reservation.end_at).getTime(), dayEnd);
    if (end <= start || dayDuration <= 0) return null;

    const left = ((start - dayStart) / dayDuration) * 100;
    const width = ((end - start) / dayDuration) * 100;
    const style = STATUS_STYLE[reservation.status] ?? STATUS_STYLE.pending;

    return (
      <div
        key={reservation.id}
        className={`absolute h-10 rounded-md px-2 flex items-center gap-2 text-sm shadow-lg cursor-pointer hover:brightness-110 transition ${style.className}`}
        style={{ left: `${left}%`, width: `${width}%`, top: 2 + laneIndex * LANE_HEIGHT }}
        onClick={() => handleReservationClick(reservation)}
        title={`${reservation.guest_name ?? "Gast"} · ${format(parseISO(reservation.start_at), "HH:mm")} - ${format(parseISO(reservation.end_at), "HH:mm")}`}
      >
        <span className="truncate">
          {reservation.guest_name ?? "Gast"} · {reservation.party_size} Pers.
        </span>
        <span className="text-[11px] opacity-80">{style.label}</span>
      </div>
    );
  };
  const renderBlockBar = (block: Block, laneIndex = 0) => {
    const start = Math.max(parseISO(block.start_at).getTime(), dayStart);
    const end = Math.min(parseISO(block.end_at).getTime(), dayEnd);
    if (end <= start || dayDuration <= 0) return null;

    const left = ((start - dayStart) / dayDuration) * 100;
    const width = ((end - start) / dayDuration) * 100;
    const label = block.reason || "Blockiert";

    return (
      <div
        key={`block-${block.id}`}
        className="absolute h-10 rounded-md px-2 flex items-center gap-2 text-sm shadow-lg cursor-pointer hover:brightness-110 transition bg-rose-700/85 border border-rose-400/70 text-white"
        style={{ left: `${left}%`, width: `${width}%`, top: 2 + laneIndex * LANE_HEIGHT }}
        title={`${label} · ${format(parseISO(block.start_at), "HH:mm")} - ${format(parseISO(block.end_at), "HH:mm")}`}
      >
        <span className="truncate">{label}</span>
      </div>
    );
  };

  if (isInitialLoading) {
    return <LoadingOverlay />;
  }

  if (!restaurant) {
    return (
      <div className="p-6 bg-background min-h-screen text-foreground">
        Kein Restaurant gefunden. Bitte zuerst ein Restaurant anlegen.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
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
      <div className="bg-card border-b border-border px-4 py-3 shadow-sm shrink-0">
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
              <div className="relative" ref={statusMenuRef}>
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((prev) => !prev)}
                  className="inline-flex items-center justify-between gap-2 min-w-[140px] rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    {selectedStatuses.length === ALL_FILTERS.length || selectedStatuses.length === 0
                      ? "Alle Status"
                      : selectedStatuses.map((s) => getStatusLabel(s)).join(", ")}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {statusMenuOpen && (
                  <div className="absolute right-0 mt-1 w-64 rounded-lg border border-border bg-background shadow-xl z-[60] max-h-[70vh] overflow-auto">
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
                    </button>
                    {ALL_FILTERS.map((status) => {
                      const active = selectedStatuses.includes(status);
                      const label = getStatusLabel(status);
                      const count =
                        status === "block"
                          ? blocksForDay.length
                          : reservationsForDayAll.filter((r) => r.status === status).length;
                      const { Icon, tone } = STATUS_ICON_MAP[status];
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            setSelectedStatuses((prev) => {
                              const next = prev.includes(status)
                                ? prev.filter((s) => s !== status)
                                : [...prev, status];
                              const cleaned = next.length === 0 ? [] : next;
                              void persistStatusFilter(cleaned);
                              return cleaned;
                            })
                          }
                          className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                            active
                              ? "font-semibold text-foreground border-l-2 border-primary bg-accent hover:bg-accent"
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
              <DropdownSelector
                options={slotOptions}
                selectedId={String(slotMinutes)}
                onSelect={(value) => {
                  const minutes = Number(value);
                  setSlotMinutes(minutes);
                  void persistSlotMinutes(minutes);
                }}
                placeholder="Intervall"
                triggerClassName="inline-flex items-center justify-between gap-2 min-w-[120px] rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                menuAlign="right"
                menuWidthClassName="w-44"
                zIndexClassName="z-[60]"
                renderSelected={(selected) => (
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {selected?.label ?? `${slotMinutes} Minuten`}
                  </span>
                )}
                renderOption={(option, selected) => (
                  <>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {option.label}
                    </span>
                    {selected && <Check className="w-4 h-4 text-primary" />}
                  </>
                )}
              />
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
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6 pt-4 min-h-0">
        {areaOrder.length === 0 ? (
          <div className="text-center text-muted-foreground mt-12">Keine Bereiche oder Tische gefunden.</div>
        ) : (
          <div className="space-y-6">
            {areaOrder.map((areaId) => {
              const areaTables = tablesByArea.get(areaId) ?? [];
              if (areaTables.length === 0) return null;
              const tableIdSet = new Set(areaTables.map((t) => t.id));
              const areaReservationCount = reservationsForDay.filter((r) => r.table_id && tableIdSet.has(r.table_id)).length;
              const areaName =
                areaId === "unassigned"
                  ? "Ohne Bereich"
                  : areas.find((a) => a.id === areaId)?.name ?? "Bereich";

              return (
                <div key={String(areaId)} className="border border-border rounded-xl bg-card/70 shadow-lg shadow-black/30">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{areaName}</div>
                      <div className="text-xs text-muted-foreground">{areaTables.length} Tische</div>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-background border border-border text-xs text-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {areaReservationCount}/{totalReservations || 0} Reservierungen
                    </div>
                  </div>

                  <div className="grid grid-cols-[200px_minmax(0,1fr)]">
                    <div className="border-r border-border">
                      <div className="h-12 px-3 flex items-center text-xs text-muted-foreground border-b border-border">
                        Zeit
                      </div>
                      {areaTables.map((table) => (
                        <div
                          key={table.id}
                          className="h-16 px-3 border-b border-card last:border-b-0 flex items-center"
                        >
                          <div className="text-sm font-semibold text-foreground">{table.number}</div>
                          <div className="text-xs text-muted-foreground ml-2">{table.capacity ?? "-"} Pers.</div>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-full" style={{ minWidth: timelineWidth }}>
                        <div className="relative h-12 border-b border-border">
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `repeating-linear-gradient(to right, rgba(75,85,99,0.35) 0, rgba(75,85,99,0.35) 1px, transparent 1px, transparent ${slotWidth}px)`,
                            }}
                          />
                          <div className="flex h-full text-[11px] text-muted-foreground">
                            {timeSlots.map((slot, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-center"
                                style={{ minWidth: slotWidth, width: slotWidth }}
                              >
                                {slot.isHour ? slot.label : ""}
                              </div>
                            ))}
                          </div>
                        </div>
                        {areaTables.map((table) => {
                          const tableReservations = reservationsByTable.get(table.id) ?? [];
                          const tableBlocks = blocksByTable.get(table.id) ?? [];
                          return (
                            <div
                              key={table.id}
                              className="relative h-16 border-b border-card last:border-b-0"
                              style={{
                                backgroundImage: `repeating-linear-gradient(to right, rgba(75,85,99,0.2) 0, rgba(75,85,99,0.2) 1px, transparent 1px, transparent ${slotWidth}px)`,
                              }}
                            >
                              {tableReservations.map((reservation) => renderReservationBar(reservation))}
                              {showBlocks && tableBlocks.map((block) => renderBlockBar(block))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {unassignedReservations.length > 0 && (
              <div className="border border-border rounded-xl bg-card/70 shadow-lg shadow-black/30">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Ohne Tisch</div>
                    <div className="text-xs text-muted-foreground">Unzugeordnete Reservierungen</div>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-background border border-border text-xs text-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {unassignedReservations.length}/{totalReservations || 0} Reservierungen
                  </div>
                </div>
                <div className="grid grid-cols-[200px_minmax(0,1fr)]">
                  <div className="border-r border-border">
                    <div className="h-12 px-3 flex items-center text-xs text-muted-foreground border-b border-border">
                      Zeit
                    </div>
                    <div className="h-16 px-3 flex items-center border-b border-card last:border-b-0">
                      <div className="text-sm font-semibold text-foreground">Ohne Tisch</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-full" style={{ minWidth: timelineWidth }}>
                      <div className="relative h-12 border-b border-border">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `repeating-linear-gradient(to right, rgba(75,85,99,0.35) 0, rgba(75,85,99,0.35) 1px, transparent 1px, transparent ${slotWidth}px)`,
                          }}
                        />
                        <div className="flex h-full text-[11px] text-muted-foreground">
                          {timeSlots.map((slot, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-center"
                              style={{ minWidth: slotWidth, width: slotWidth }}
                            >
                              {slot.isHour ? slot.label : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div
                        className="relative border-b border-card"
                        style={{
                          height: Math.max(64, unassignedLanes.laneCount * LANE_HEIGHT + 16),
                          backgroundImage: `repeating-linear-gradient(to right, rgba(75,85,99,0.2) 0, rgba(75,85,99,0.2) 1px, transparent 1px, transparent ${slotWidth}px)`,
                        }}
                      >
                        {unassignedReservations.map((reservation) =>
                          renderReservationBar(reservation, unassignedLanes.map.get(reservation.id) ?? 0)
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {restaurant && (
        <ReservationDialog
          open={reservationDialogOpen}
          onOpenChange={setReservationDialogOpen}
          restaurantId={restaurant.id}
          table={selectedTable}
          selectedDate={selectedReservation ? parseISO(selectedReservation.start_at) : selectedDate}
          reservation={selectedReservation}
          onReservationCreated={handleReservationCreated}
          onReservationUpdated={handleReservationUpdated}
          availableTables={tables}
          onNotify={addToast}
          readOnly={true}
        />
      )}
    </div>
  );
}
