"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { reservationsApi, Reservation, ReservationCreate, ReservationUpdate } from "@/lib/api/reservations";
import { blocksApi } from "@/lib/api/blocks";
import { blockAssignmentsApi } from "@/lib/api/block-assignments";
import { Table } from "@/lib/api/tables";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Clock, ShieldCheck, Users, CheckCircle, XCircle, AlertTriangle, Check, Trash2, X, Save, Star, Gift, Accessibility, Package, Ban } from "lucide-react";
import { confirmAction } from "@/lib/utils";

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  table: Table | null;
  selectedDate: Date;
  reservation?: Reservation | null;
  onReservationCreated: () => void;
  onBlockCreated?: () => void;
  onReservationUpdated?: () => void;
  availableTables?: Table[];
  onNotify?: (message: string, variant?: "info" | "success" | "error") => void;
  defaultStatus?: Reservation["status"];
}

export function ReservationDialog({
  open,
  onOpenChange,
  restaurantId,
  table,
  selectedDate,
  reservation,
  onReservationCreated,
  onBlockCreated,
  onReservationUpdated,
  availableTables = [],
  onNotify,
}: ReservationDialogProps) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [reservationDate, setReservationDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [endTime, setEndTime] = useState(() => {
    const end = new Date();
    end.setHours(end.getHours() + 2, end.getMinutes(), 0, 0);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  });
  const [notes, setNotes] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [formMode, setFormMode] = useState<"reservation" | "block">("reservation");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [status, setStatus] = useState<Reservation["status"]>("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const isMitarbeiter = currentUser?.role === "mitarbeiter";
  const isMitarbeiterLocked = !!reservation && isMitarbeiter;
  const defaultGuestName = "Gast";
  const wasOpen = useRef(false);
  const lastReservationId = useRef<number | null>(null);
  const lastTableId = useRef<number | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const tagsDropdownRef = useRef<HTMLDivElement | null>(null);
  const isBlockMode = !reservation && formMode === "block";
  const [loadedReservation, setLoadedReservation] = useState<Reservation | null>(null);

  const STATUS_ICON_MAP: Record<
    Reservation["status"],
    { Icon: typeof Clock; tone: string; label: string }
  > = useMemo(
    () => ({
      pending: { Icon: Clock, tone: "bg-blue-900/40 border-blue-600 text-blue-100", label: "Ausstehend" },
      confirmed: { Icon: ShieldCheck, tone: "bg-indigo-900/40 border-indigo-600 text-indigo-100", label: "Bestätigt" },
      seated: { Icon: Users, tone: "bg-emerald-900/40 border-emerald-600 text-emerald-100", label: "Platziert" },
      completed: { Icon: CheckCircle, tone: "bg-amber-900/30 border-amber-600 text-amber-100", label: "Abgeschlossen" },
      canceled: { Icon: XCircle, tone: "bg-red-900/30 border-red-600 text-red-100", label: "Storniert" },
      no_show: { Icon: AlertTriangle, tone: "bg-orange-900/30 border-orange-600 text-orange-100", label: "No-Show" },
    }),
    []
  );

  const statusOptions = useMemo(() => {
    const base = ["pending", "confirmed", "seated", "completed", "no_show"] as Reservation["status"][];
    const extra =
      currentUser?.role === "servecta" ||
      currentUser?.role === "restaurantinhaber" ||
      currentUser?.role === "schichtleiter"
        ? ["canceled" as const]
        : [];
    return [...base, ...extra];
  }, [currentUser?.role]);

  const initializeForm = () => {
    const currentReservation = loadedReservation || reservation;
    if (currentReservation) {
      setFormMode("reservation");
      setGuestName(currentReservation.guest_name || "");
      setGuestEmail(currentReservation.guest_email || "");
      setGuestPhone(currentReservation.guest_phone || "");
      setPartySize(currentReservation.party_size);
      setNotes(currentReservation.notes || "");
      setBlockReason("");
      setSelectedTableId(currentReservation.table_id);
      setStatus(currentReservation.status);
      setTags(currentReservation.tags || []);
      setReservationDate(format(new Date(currentReservation.start_at), "yyyy-MM-dd"));

      const start = new Date(currentReservation.start_at);
      setStartTime(
        `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
      );

      const end = new Date(currentReservation.end_at);
      setEndTime(
        `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
      );
    } else {
      setFormMode("reservation");
      setGuestName("");
      setGuestEmail("");
      setGuestPhone("");
      setNotes("");
      setBlockReason("");
      const nowCurrent = new Date();
      const endCurrent = new Date(nowCurrent);
      endCurrent.setHours(nowCurrent.getHours() + 2, nowCurrent.getMinutes(), 0, 0);

      setStartTime(
        `${String(nowCurrent.getHours()).padStart(2, "0")}:${String(nowCurrent.getMinutes()).padStart(2, "0")}`
      );
      setEndTime(
        `${String(endCurrent.getHours()).padStart(2, "0")}:${String(endCurrent.getMinutes()).padStart(2, "0")}`
      );
      setReservationDate(format(nowCurrent, "yyyy-MM-dd"));
      setSelectedTableId(table?.id ?? null);
      setStatus(table ? "confirmed" : "pending");
      setTags([]);
      if (table) {
        setPartySize(Math.min(table.capacity, 4));
      } else {
        setPartySize(2);
      }
    }
  };

  const buildDateFromInput = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(selectedDate);
    if (year && month && day) {
      date.setFullYear(year, month - 1, day);
    }
    return date;
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error("Fehler beim Laden des aktuellen Users:", error);
      }
    };
    loadCurrentUser();
  }, [restaurantId]);

  useEffect(() => {
    const opening = open && !wasOpen.current;
    const reservationChanged = (reservation?.id ?? null) !== lastReservationId.current;
    const tableChanged = (table?.id ?? null) !== lastTableId.current;

    if (opening || reservationChanged || (!reservation && tableChanged)) {
      initializeForm();
    }

    wasOpen.current = open;
    lastReservationId.current = reservation?.id ?? null;
    lastTableId.current = table?.id ?? null;
  }, [open, reservation, table, selectedDate]);

  // Lade Reservierung neu, wenn Dialog geöffnet wird, um sicherzustellen, dass Upsell-Pakete vorhanden sind
  useEffect(() => {
    if (open && reservation?.id) {
      reservationsApi.get(restaurantId, reservation.id)
        .then((fullReservation) => {
          setLoadedReservation(fullReservation);
        })
        .catch((err) => {
          console.error("Fehler beim Laden der Reservierung:", err);
          setLoadedReservation(reservation);
        });
    } else {
      setLoadedReservation(reservation || null);
    }
  }, [open, reservation?.id, restaurantId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusOpen(false);
      }
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setTagsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const TAG_OPTIONS = [
    { value: "VIP", label: "VIP", Icon: Star },
    { value: "Allergie", label: "Allergie", Icon: AlertTriangle },
    { value: "Geburtstag", label: "Geburtstag", Icon: Gift },
    { value: "Barrierefrei", label: "Barrierefrei", Icon: Accessibility },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const startDate = buildDateFromInput(reservationDate);
      const [hours, minutes] = startTime.split(":").map(Number);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = buildDateFromInput(reservationDate);
      const [endHours, endMinutes] = endTime.split(":").map(Number);
      endDate.setHours(endHours, endMinutes, 0, 0);
      // Wenn Endzeit vor Startzeit liegt, gehe vom nächsten Tag aus
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      if (isBlockMode) {
        try {
          await blocksApi.create(restaurantId, {
            table_id: null,
            start_at: startDate.toISOString(),
            end_at: endDate.toISOString(),
            reason: blockReason || null,
          });
          onBlockCreated?.();
          onNotify?.("Block wurde erstellt. Ziehe ihn auf einen Tisch.", "success");
          onOpenChange(false);
        } catch (err) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Fehler beim Erstellen des Blocks");
          }
        }
        return;
      }

      if (selectedTableId && selectedTableId > 0) {
        let blocks = [];
        let assignments = [];
        try {
          blocks = await blocksApi.list(restaurantId);
          assignments = await blockAssignmentsApi.list(restaurantId);
        } catch (err) {
          setError("Fehler beim Prüfen der Blockierungen");
          onNotify?.("Fehler beim Prüfen der Blockierungen", "error");
          return;
        }
        const assignedBlockIds = new Set(
          assignments
            .filter((assignment) => assignment.table_id === selectedTableId)
            .map((assignment) => assignment.block_id)
        );
        const hasBlockConflict = blocks.some((block) => {
          if (!assignedBlockIds.has(block.id)) return false;
          const blockStart = new Date(block.start_at);
          const blockEnd = new Date(block.end_at);
          return startDate < blockEnd && endDate > blockStart;
        });
        if (hasBlockConflict) {
          setError("Tisch ist in diesem Zeitraum blockiert.");
          onNotify?.("Tisch ist in diesem Zeitraum blockiert.", "error");
          return;
        }
      }

      if (reservation) {
        // Mitarbeiter können nur den Status ändern
        if (currentUser?.role === "mitarbeiter") {
          const updateData: ReservationUpdate = {
            status: status,
          };
          await reservationsApi.update(restaurantId, reservation.id, updateData);
        } else {
          // Schichtleiter und höher können alle Felder ändern
          const updateData: ReservationUpdate = {
            table_id: selectedTableId,
            guest_id: reservation.guest_id,
            guest_name: (guestName || defaultGuestName).trim(),
            guest_email: guestEmail || null,
            guest_phone: guestPhone || null,
            start_at: startDate.toISOString(),
            end_at: endDate.toISOString(),
            party_size: partySize,
            status: status,
            notes: notes || null,
            tags,
          };
      await reservationsApi.update(restaurantId, reservation.id, updateData);
    }
    onReservationUpdated?.();
  } else {
        const data: ReservationCreate = {
          table_id: selectedTableId,
          guest_name: (guestName || defaultGuestName).trim(),
          guest_email: guestEmail || null,
          guest_phone: guestPhone || null,
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          party_size: partySize,
          status: selectedTableId ? "confirmed" : "pending",
          channel: "manual",
          notes: notes || null,
          tags: tags,
        };
    await reservationsApi.create(restaurantId, data);
    onReservationCreated();
        onNotify?.(
          `${(guestName || defaultGuestName).trim()} reserviert (${format(startDate, "HH:mm")}–${format(endDate, "HH:mm")} Uhr).`,
          "success"
        );
      }

      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Speichern der Reservierung");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const currentReservation = loadedReservation || reservation;
    if (!currentReservation) return;

    if (!confirmAction("Möchten Sie die Reservierung wirklich stornieren? Der Gast erhält eine E-Mail-Benachrichtigung.")) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await reservationsApi.cancel(restaurantId, currentReservation.id);
      onNotify?.("Reservierung storniert. E-Mail wurde an den Gast gesendet.", "success");
      onReservationUpdated?.();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        onNotify?.(err.message, "error");
      } else {
        const errorMsg = "Fehler beim Stornieren der Reservierung";
        setError(errorMsg);
        onNotify?.(errorMsg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const currentReservation = loadedReservation || reservation;
    if (!currentReservation) return;

    if (!confirmAction("Möchtest du diese Reservierung wirklich löschen?")) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await reservationsApi.delete(restaurantId, currentReservation.id);
      onReservationUpdated?.();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Löschen der Reservierung");
      }
    } finally {
      setLoading(false);
    }
  };

  // Dialog kann immer geöffnet werden, auch ohne Tisch

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {reservation
              ? "Reservierung bearbeiten"
              : "Neue Reservierung"}
          </DialogTitle>
          <DialogDescription>
            {reservation
              ? "Bearbeite die Reservierungsdetails"
              : `Erstelle eine neue Reservierung für ${format(selectedDate, "d. MMMM yyyy", { locale: de })}`}
          </DialogDescription>
          {!reservation && (
            <div className="mt-3 inline-flex items-center rounded-lg border border-gray-700/70 bg-gray-800/90 p-0.5 backdrop-blur-sm min-h-[32px] md:min-h-[36px]">
              <button
                type="button"
                onClick={() => setFormMode("reservation")}
                className={`px-3 py-1 rounded-md text-sm md:text-base font-semibold transition-colors min-h-[32px] md:min-h-[36px] ${
                  formMode === "reservation"
                    ? "bg-blue-600 text-white border border-blue-500/80 shadow-inner"
                    : "text-gray-200 border border-transparent hover:bg-gray-700"
                }`}
              >
                Reservierung
              </button>
              <button
                type="button"
                onClick={() => setFormMode("block")}
                className={`px-3 py-1 rounded-md text-sm md:text-base font-semibold transition-colors min-h-[32px] md:min-h-[36px] ${
                  formMode === "block"
                    ? "bg-blue-600 text-white border border-blue-500/80 shadow-inner"
                    : "text-gray-200 border border-transparent hover:bg-gray-700"
                }`}
              >
                Block
              </button>
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-md mx-6 flex items-start justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-200 hover:text-white"
                aria-label="Fehlermeldung schließen"
              >
                ×
              </button>
            </div>
          )}
          <div className="space-y-3 md:space-y-4 px-4 md:px-6">
            {isBlockMode ? (
              <div className="pb-2 space-y-3 md:space-y-4">
                <div>
                  <label htmlFor="blockReason" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                    Name (optional)
                  </label>
                  <Input
                    id="blockReason"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="z.B. Event, Wartung"
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <div>
                    <label htmlFor="blockDate" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                      Datum *
                    </label>
                    <Input
                      id="blockDate"
                      type="date"
                      value={reservationDate}
                      onChange={(e) => setReservationDate(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label htmlFor="blockStartTime" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                      Startzeit *
                    </label>
                    <Input
                      id="blockStartTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label htmlFor="blockEndTime" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                      Endzeit *
                    </label>
                    <Input
                      id="blockEndTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {(!reservation || currentUser?.role !== "mitarbeiter") && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label htmlFor="guestName" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                          Gästename
                        </label>
                        <Input
                          id="guestName"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Leer lassen für Standard 'Gast'"
                          disabled={isMitarbeiterLocked}
                        />
                      </div>
                      <div>
                        <label htmlFor="partySize" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                          Personen *
                        </label>
                        <Input
                          id="partySize"
                          type="number"
                          min="1"
                          max={table?.capacity || 20}
                          value={partySize}
                          onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                          required
                          disabled={isMitarbeiterLocked}
                        />
                        {table && (
                          <p className="text-xs md:text-sm text-gray-400 mt-1 md:mt-2">
                            Max. Kapazität: {table.capacity} Personen
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label htmlFor="guestEmail" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                          E-Mail
                        </label>
                        <Input
                          id="guestEmail"
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="max@example.com"
                          disabled={isMitarbeiterLocked}
                        />
                      </div>
                      <div>
                        <label htmlFor="guestPhone" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                          Telefon
                        </label>
                        <Input
                          id="guestPhone"
                          type="tel"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="+49 123 456789"
                          disabled={isMitarbeiterLocked}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      <div>
                        <label htmlFor="reservationDate" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                          Datum *
                        </label>
                        <Input
                          id="reservationDate"
                          type="date"
                          value={reservationDate}
                          onChange={(e) => setReservationDate(e.target.value)}
                          required
                          disabled={isMitarbeiterLocked}
                        />
                      </div>
                      <div>
                        <label htmlFor="startTime" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                          Startzeit *
                        </label>
                        <Input
                          id="startTime"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          required
                          disabled={isMitarbeiterLocked}
                        />
                      </div>
                      <div>
                        <label htmlFor="endTime" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                          Endzeit *
                        </label>
                        <Input
                          id="endTime"
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          required
                          disabled={isMitarbeiterLocked}
                        />
                      </div>
                    </div>
                  </>
                )}

                {reservation && (
                  <div ref={statusDropdownRef} className="relative">
                    <label className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">Status</label>
                    <button
                      type="button"
                      onClick={() => setStatusOpen((prev) => !prev)}
                      className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white px-3 py-2 text-sm flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation min-h-[40px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {(() => {
                          const entry = STATUS_ICON_MAP[status] || STATUS_ICON_MAP.pending;
                          const Icon = entry.Icon;
                          return (
                            <span
                              className={`inline-flex items-center justify-center w-9 h-9 rounded-md border ${entry.tone} shrink-0`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                          );
                        })()}
                        <span className="truncate">
                          {STATUS_ICON_MAP[status]?.label || "Status wählen"}
                        </span>
                      </div>
                      <svg
                        className={`h-4 w-4 transition-transform ${statusOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {statusOpen && (
                      <div className="absolute z-[110] mt-1 w-full rounded-lg border border-gray-700 bg-gray-900/95 shadow-xl backdrop-blur-sm">
                        {statusOptions.map((value) => {
                          const entry = STATUS_ICON_MAP[value] || STATUS_ICON_MAP.pending;
                          const Icon = entry.Icon;
                          const isActive = value === status;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setStatus(value);
                                setStatusOpen(false);
                              }}
                              className={`w-full px-3 py-3 text-sm transition-colors flex items-center justify-between ${
                                isActive ? "bg-gray-800/80 text-white font-semibold border-l-2 border-blue-500" : "text-gray-100 hover:bg-gray-800/60"
                              }`}
                            >
                              <span className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`inline-flex items-center justify-center w-9 h-9 rounded-md border ${entry.tone} shrink-0`}
                                >
                                  <Icon className="w-4 h-4" />
                                </span>
                                <span className="truncate">{entry.label}</span>
                              </span>
                              {isActive && (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-white/60 bg-white/10 text-blue-200">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div ref={tagsDropdownRef} className="relative">
                  <label className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">Tags</label>
                  <button
                    type="button"
                    onClick={() => setTagsOpen((prev) => !prev)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 text-white px-3 py-2 text-sm flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation min-h-[40px]"
                  >
                    <span className="flex-1 min-w-0">
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag) => {
                            const tagMeta = TAG_OPTIONS.find((opt) => opt.value === tag);
                            const TagIcon = tagMeta?.Icon;
                            return (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-700/80 border border-gray-600 text-xs text-white"
                              >
                                {TagIcon && <TagIcon className="w-3.5 h-3.5" />}
                                <span className="truncate">{tagMeta?.label ?? tag}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-400 block text-left">Keine Tags</span>
                      )}
                    </span>
                    <svg
                      className={`h-4 w-4 transition-transform ${tagsOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {tagsOpen && (
                    <div className="absolute z-[110] mt-1 w-full rounded-lg border border-gray-700 bg-gray-900/95 shadow-xl backdrop-blur-sm">
                      {TAG_OPTIONS.map((item) => {
                        const active = tags.includes(item.value);
                        const TagIcon = item.Icon;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setTags((prev) =>
                                prev.includes(item.value)
                                  ? prev.filter((t) => t !== item.value)
                                  : [...prev, item.value]
                              );
                              setTagsOpen(false);
                            }}
                            className={`w-full px-3 py-3 text-sm transition-colors flex items-center justify-between ${
                              active ? "bg-gray-800/80 text-white font-semibold border-l-2 border-blue-500" : "text-gray-100 hover:bg-gray-800/60"
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              {TagIcon && (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-700 bg-gray-800/80 shrink-0">
                                  <TagIcon className="w-4 h-4" />
                                </span>
                              )}
                              <span className="truncate">{item.label}</span>
                            </span>
                            {active && <Check className="w-4 h-4 text-blue-200" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {(!reservation || currentUser?.role !== "mitarbeiter") && (
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300">
                      Notizen
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-sm touch-manipulation min-h-[100px]"
                      rows={3}
                      placeholder="Besondere Wünsche oder Anmerkungen..."
                      disabled={isMitarbeiterLocked}
                    />
                  </div>
                )}
                
                {/* Upsell-Pakete anzeigen (nur bei bestehenden Reservierungen) */}
                {(loadedReservation || reservation) && (loadedReservation || reservation)?.upsell_packages && (loadedReservation || reservation)!.upsell_packages!.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5 md:mb-2 text-gray-300 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Zusatzpakete
                    </label>
                    <div className="space-y-2 bg-gray-800/50 rounded-md p-3 border border-gray-700">
                      {(loadedReservation || reservation)!.upsell_packages!.map((pkg) => (
                        <div key={pkg.id} className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium text-white">{pkg.name}</div>
                            {pkg.description && (
                              <div className="text-sm text-gray-400 mt-0.5">{pkg.description}</div>
                            )}
                          </div>
                          <div className="font-semibold text-purple-400">{pkg.price.toFixed(2)} €</div>
                        </div>
                      ))}
                      <div className="pt-2 mt-2 border-t border-gray-700 flex items-center justify-between">
                        <span className="font-medium text-gray-300">Gesamt</span>
                        <span className="font-bold text-purple-400">
                          {(loadedReservation || reservation)!.upsell_packages!.reduce((sum, pkg) => sum + pkg.price, 0).toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            {(loadedReservation || reservation) && (loadedReservation || reservation)!.status !== "canceled" && (
              currentUser?.role === "schichtleiter" || 
              currentUser?.role === "restaurantinhaber" || 
              currentUser?.role === "servecta"
            ) && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="mr-auto border-orange-600 text-orange-400 hover:bg-orange-900/20 hover:border-orange-500 gap-2"
              >
                <Ban className="w-4 h-4" />
                Stornieren
              </Button>
            )}
            {(loadedReservation || reservation) && (currentUser?.role === "servecta" || currentUser?.role === "restaurantinhaber") && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.4)] gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Save className="w-4 h-4 animate-spin" />
                  <span>{reservation ? "Wird gespeichert..." : "Wird erstellt..."}</span>
                </>
              ) : reservation ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Speichern</span>
                </>
              ) : isBlockMode ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Block erstellen</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Reservierung erstellen</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
