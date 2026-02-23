"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Reservation } from "@/lib/api/reservations";
import { Block } from "@/lib/api/blocks";
import { ReservationCard } from "./reservation-card";
import { BlockCard } from "./block-card";
import { Ban, Clock, Plus, Search, CheckCircle, ShieldCheck, Users, XCircle, Filter, Check, PanelLeft, PanelRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/lib/hooks/use-user-settings";

interface WaitlistSidebarProps {
  reservations: Reservation[];
  blocks?: Block[];
  activeReservationId: string | null;
  activeBlockId?: string | null;
  getTableName?: (tableId: string | null) => string;
  getReservationTableLabel?: (reservation: Reservation) => string | null;
  getBlockTableLabels?: (block: Block) => string[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onReservationClick?: (reservation: Reservation) => void;
  onReservationDelete?: (reservation: Reservation) => void;
  onBlockClick?: (block: Block) => void;
  onNewReservation?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

const STATUS_SETTINGS_KEY = "dashboard_status_filters";
type WaitlistStatusValue = Reservation["status"] | "block";
const normalizeStatus = (value: string): WaitlistStatusValue | null => {
  const normalized = value === "noShow" ? "no_show" : value;
  const allowed: Reservation["status"][] = ["pending", "confirmed", "seated", "completed", "canceled", "no_show"];
  if (normalized === "block") return "block";
  return allowed.includes(normalized as Reservation["status"]) ? (normalized as Reservation["status"]) : null;
};

export function WaitlistSidebar({ 
  reservations, 
  blocks = [],
  activeReservationId, 
  activeBlockId,
  getTableName,
  getReservationTableLabel,
  getBlockTableLabels,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  onReservationClick,
  onReservationDelete,
  onBlockClick,
  onNewReservation,
  collapsed = false,
  onToggle,
}: WaitlistSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "waitlist",
  });
  const { settings, updateSettings } = useUserSettings();
  const statusPersistRef = useRef<string>("");

  type WaitlistFilterKey = "pending" | "confirmed" | "seated" | "completed" | "canceled" | "noShow" | "block";
  type WaitlistStatusFilterKey = Exclude<WaitlistFilterKey, "block">;
  const waitlistFilters = useMemo<
    Record<
      WaitlistFilterKey,
      { label: string; statuses: Reservation["status"][]; tone: string; icon: typeof Clock }
    >
  >(
    () => ({
      pending: {
        label: "Ausstehend",
        statuses: ["pending"],
        tone: "bg-blue-900/40 border-blue-600 text-blue-100",
        icon: Clock,
      },
      confirmed: {
        label: "Bestätigt",
        statuses: ["confirmed"],
        tone: "bg-indigo-900/40 border-indigo-600 text-indigo-100",
        icon: ShieldCheck,
      },
      seated: {
        label: "Platziert",
        statuses: ["seated"],
        tone: "bg-emerald-900/40 border-emerald-600 text-emerald-100",
        icon: Users,
      },
      completed: {
        label: "Abgeschlossen",
        statuses: ["completed"],
        tone: "bg-amber-900/30 border-amber-600 text-amber-100",
        icon: CheckCircle,
      },
      canceled: {
        label: "Storniert",
        statuses: ["canceled"],
        tone: "bg-red-900/30 border-red-600 text-red-100",
        icon: XCircle,
      },
      noShow: {
        label: "No-Show",
        statuses: ["no_show"],
        tone: "bg-orange-900/30 border-orange-600 text-orange-100",
        icon: XCircle,
      },
      block: {
        label: "Block",
        statuses: [],
        tone: "bg-rose-900/40 border-rose-600 text-rose-100",
        icon: Ban,
      },
    }),
    []
  );
  const filterKeyToStatus = useMemo<Record<WaitlistStatusFilterKey, Reservation["status"]>>(
    () => ({
      pending: "pending",
      confirmed: "confirmed",
      seated: "seated",
      completed: "completed",
      canceled: "canceled",
      noShow: "no_show",
    }),
    []
  );

  const allFilterKeys = useMemo(() => Object.keys(waitlistFilters) as WaitlistFilterKey[], [waitlistFilters]);
  const statusFilterKeys = useMemo(
    () => allFilterKeys.filter((key) => key !== "block") as WaitlistStatusFilterKey[],
    [allFilterKeys]
  );
  const [activeFilters, setActiveFilters] = useState<WaitlistFilterKey[]>(allFilterKeys);
  const [filterOpen, setFilterOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Initialisierung aus User-Settings
  useEffect(() => {
    if (!settings) return;
    const stored = (settings.settings || {})[STATUS_SETTINGS_KEY];
    if (Array.isArray(stored)) {
      const normalized = stored
        .map((s) => normalizeStatus(s))
        .filter((s): s is WaitlistStatusValue => Boolean(s));
      if (normalized.length > 0) {
        const hasBlock = normalized.includes("block");
        const nextFilters = allFilterKeys.filter((key) =>
          key === "block" ? hasBlock : normalized.includes(filterKeyToStatus[key])
        );
        setActiveFilters(nextFilters.length > 0 ? nextFilters : allFilterKeys);
        statusPersistRef.current = JSON.stringify(normalized);
      }
    }
  }, [settings, allFilterKeys, filterKeyToStatus]);

  const persistFilters = useCallback(
    async (filters: WaitlistFilterKey[]) => {
      const statusFilters = filters.filter((key) => key !== "block") as WaitlistStatusFilterKey[];
      const statuses = Array.from(
        new Set(
          statusFilters.map((key) => filterKeyToStatus[key]).map((s) => normalizeStatus(s)).filter(Boolean)
        )
      ) as WaitlistStatusValue[];
      if (filters.includes("block")) {
        statuses.push("block");
      }
      const serialized = JSON.stringify(statuses);
      if (serialized === statusPersistRef.current) return;
      statusPersistRef.current = serialized;
      try {
        await updateSettings({ [STATUS_SETTINGS_KEY]: statuses });
      } catch (err) {
        console.error("Fehler beim Speichern der Waitlist-Filtereinstellungen:", err);
        statusPersistRef.current = "";
      }
    },
    [updateSettings, filterKeyToStatus]
  );

  // Interne State für Suche, falls nicht von außen bereitgestellt
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = externalOnSearchChange || setInternalSearchQuery;
  const showBlocks = activeFilters.length === 0 || activeFilters.includes("block");

  // Gefilterte Reservierungen basierend auf Status und Suchbegriff
  const filteredReservations = useMemo(() => {
    const activeStatusKeys =
      activeFilters.length > 0
        ? (activeFilters.filter((key) => key !== "block") as WaitlistStatusFilterKey[])
        : statusFilterKeys;
    const activeStatusSet = new Set(activeStatusKeys.flatMap((key) => waitlistFilters[key].statuses));

    const statusFiltered = reservations.filter((r) => activeStatusSet.has(r.status));

    if (!searchQuery.trim()) {
      return statusFiltered;
    }

    const query = searchQuery.toLowerCase();
    return statusFiltered.filter((r) => {
      const guestName = (r.guest_name || "").toLowerCase();
      const guestEmail = (r.guest_email || "").toLowerCase();
      const guestPhone = (r.guest_phone || "").toLowerCase();
      const notes = (r.notes || "").toLowerCase();
      return (
        guestName.includes(query) ||
        guestEmail.includes(query) ||
        guestPhone.includes(query) ||
        notes.includes(query)
      );
    });
  }, [reservations, searchQuery, activeFilters, waitlistFilters, statusFilterKeys]);

  const filteredBlocks = useMemo(() => {
    if (!showBlocks) return [];
    if (!searchQuery.trim()) return blocks;
    const query = searchQuery.toLowerCase();
    return blocks.filter((block) => (block.reason || "").toLowerCase().includes(query));
  }, [blocks, searchQuery, showBlocks]);

  // Debug: Log wenn über der Drop-Zone
  if (isOver) {
    console.log("WaitlistSidebar - isOver: true");
  }

  const selectedStatuses = activeFilters.length > 0 ? activeFilters : allFilterKeys;

  const activeStatusKeys = selectedStatuses.filter((key) => key !== "block") as WaitlistStatusFilterKey[];
  const activeReservationKeys =
    selectedStatuses.length > 0 ? activeStatusKeys : statusFilterKeys;
  const activeReservationCount = reservations.filter((r) =>
    activeReservationKeys.some((key) => waitlistFilters[key].statuses.includes(r.status))
  ).length;
  const activeBlockCount = showBlocks ? blocks.length : 0;
  const activeItemCount = activeReservationCount + activeBlockCount;

  const activeLabel =
    activeFilters.length === 0 || activeFilters.length === allFilterKeys.length
      ? "Alle Status"
      : activeFilters.map((key) => waitlistFilters[key].label).join(", ");

  const showCollapsed = collapsed;

  return (
    <div
      ref={setNodeRef}
      className={`
        w-full
        bg-card border-r border-border flex flex-col
        ${isOver ? "bg-yellow-900/30 border-yellow-500 border-2" : ""}
        transition-colors
        relative z-[30]
        shadow-lg
        h-full
        pointer-events-auto
        shrink-0
        overflow-hidden
    `}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className={`absolute inset-0 flex items-start justify-center pt-4 transition-opacity duration-300 ${
          showCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {onToggle && (
          <button
            onClick={onToggle}
            className="bg-muted hover:bg-accent border border-border rounded-lg p-2 text-foreground shadow-lg transition-colors touch-manipulation min-h-[36px] md:min-h-[40px] min-w-[36px] md:min-w-[40px] flex items-center justify-center"
            aria-label="Sidebar ausklappen"
          >
            <PanelLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
      <div
        className={`h-full flex flex-col transition-opacity duration-300 ${
          showCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
      <div className="p-3 md:p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base md:text-lg font-semibold text-foreground">Reservierungsübersicht</h2>
          {onToggle && (
            <button
              onClick={onToggle}
              className="bg-muted hover:bg-accent border border-border rounded-lg p-1.5 text-foreground transition-colors touch-manipulation min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
              aria-label="Sidebar einklappen"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-2 md:mt-3 space-y-2" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((prev) => !prev)}
            className="w-full rounded-lg border border-border bg-background text-foreground px-2 md:px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring flex items-center justify-between gap-2 touch-manipulation min-h-[40px]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-white/10 bg-black/10 shrink-0">
                <Filter className="w-4 h-4" />
              </span>
              <span className="truncate">{activeLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-muted">
                {activeItemCount}
              </span>
              <span className="text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground">
                {activeFilters.length === 0 || activeFilters.length === allFilterKeys.length
                  ? "alle"
                  : `${activeFilters.length}/${allFilterKeys.length}`}
              </span>
              <svg
                className={`h-4 w-4 transition-transform ${filterOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {filterOpen && (
            <div className="absolute z-[50] mt-1 left-0 right-0 max-h-[70vh] overflow-auto overscroll-contain rounded-lg border border-border bg-card shadow-xl backdrop-blur-sm">
              <button
                type="button"
                  onClick={() =>
                    setActiveFilters((prev) => {
                      const next = prev.length === allFilterKeys.length ? [] : allFilterKeys;
                      void persistFilters(next);
                      return next;
                    })
                  }
                className={`w-full px-3 py-3 flex items-center justify-between gap-3 text-sm transition-colors ${
                  activeFilters.length === allFilterKeys.length
                    ? "bg-muted/80 text-foreground font-semibold border-l-2 border-foreground/40"
                    : "bg-card text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-muted shrink-0">
                    <Filter className="w-4 h-4" />
                  </span>
                  <span className="truncate">Alle Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-muted">
                    {reservations.length + blocks.length}
                  </span>
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${
                      activeFilters.length === allFilterKeys.length
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    }`}
                  >
                    {activeFilters.length === allFilterKeys.length && <Check className="w-4 h-4" />}
                  </span>
                </div>
              </button>
              {(Object.keys(waitlistFilters) as WaitlistFilterKey[]).map((key) => {
                const filter = waitlistFilters[key];
                const count =
                  key === "block"
                    ? blocks.length
                    : reservations.filter((r) => filter.statuses.includes(r.status)).length;
                const Icon = filter.icon;
                const isActive = activeFilters.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveFilters((prev) => {
                        if (prev.includes(key)) {
                          const next = prev.filter((k) => k !== key);
                          void persistFilters(next);
                          return next;
                        }
                        const next = [...prev, key];
                        void persistFilters(next);
                        return next;
                      });
                    }}
                    className={`w-full px-3 py-3 flex items-center justify-between gap-3 text-sm transition-colors ${
                      isActive
                        ? "bg-muted/80 text-foreground font-semibold border-l-2 border-foreground/40"
                        : "bg-card text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-md border shrink-0 ${
                          isActive
                            ? filter.tone
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? "text-foreground dark:text-current" : ""}`} />
                      </span>
                      <span className="truncate">{filter.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          isActive
                            ? "bg-background text-foreground border border-foreground/30"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {count}
                      </span>
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        {isActive && <Check className="w-4 h-4" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {/* Suchleiste */}
        <div className="mt-2 md:mt-3 relative">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Suche..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 md:pl-10 touch-manipulation min-h-[40px] text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-2 md:space-y-3 min-h-0">
        {filteredReservations.length === 0 && filteredBlocks.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 md:py-8">
            <Clock className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">
              {searchQuery.trim() ? "Keine Reservierungen gefunden" : "Keine Reservierungen in der Warteliste"}
            </p>
            {isOver && (
              <p className="text-sm text-yellow-400 mt-2 font-medium">
                Hier ablegen, um Tischzuweisung zu entfernen
              </p>
            )}
          </div>
        ) : (
          <>
            {filteredBlocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                isDragging={activeBlockId === block.id}
                tableLabels={getBlockTableLabels?.(block)}
                onClick={onBlockClick}
              />
            ))}
            {filteredReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                isDragging={activeReservationId === reservation.id}
                getTableName={getTableName}
                getTableLabel={getReservationTableLabel}
                onClick={onReservationClick}
                onDelete={onReservationDelete}
              />
            ))}
          </>
        )}
        {isOver && filteredReservations.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-900/30 border-2 border-dashed border-yellow-500 rounded-lg text-center text-sm text-yellow-300">
            Hier ablegen, um Tischzuweisung zu entfernen
          </div>
        )}
      </div>
      {onNewReservation && (
        <div className="p-3 md:p-4 border-t border-border bg-card shrink-0">
          <Button
            onClick={onNewReservation}
            className="w-full touch-manipulation min-h-[40px] text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Reservierung
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
