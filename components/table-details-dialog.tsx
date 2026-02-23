"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { tablesApi, Table, TableUpdate } from "@/lib/api/tables";
import { reservationsApi, Reservation } from "@/lib/api/reservations";
import { blocksApi, Block } from "@/lib/api/blocks";
import { blockAssignmentsApi, BlockAssignment } from "@/lib/api/block-assignments";
import { tableDayConfigsApi } from "@/lib/api/table-day-configs";
import { reservationTableDayConfigsApi } from "@/lib/api/reservation-table-day-configs";
import { Area } from "@/lib/api/areas";
import { authApi } from "@/lib/api/auth";
import { Order, OrderStatus } from "@/lib/api/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { format } from "date-fns";
import { Trash2, Plus, Clock, CheckCircle, EyeOff, ChevronDown, XCircle, X, Save, Star, AlertTriangle, Gift, Accessibility } from "lucide-react";
import { confirmAction } from "@/lib/utils";
import { BlockTableDialog } from "@/components/block-table-dialog";

const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: string; border: string }> = {
  open: {
    label: "Offen",
    tone: "bg-blue-900/40 border-blue-600 text-foreground dark:text-blue-100",
    border: "border-blue-600/70",
  },
  sent_to_kitchen: {
    label: "An Küche gesendet",
    tone: "bg-indigo-900/40 border-indigo-600 text-foreground dark:text-indigo-100",
    border: "border-indigo-600/70",
  },
  in_preparation: {
    label: "In Zubereitung",
    tone: "bg-yellow-900/40 border-yellow-600 text-foreground dark:text-yellow-100",
    border: "border-yellow-600/70",
  },
  ready: {
    label: "Fertig",
    tone: "bg-emerald-900/40 border-emerald-600 text-foreground dark:text-emerald-100",
    border: "border-emerald-600/70",
  },
  served: {
    label: "Serviert",
    tone: "bg-green-900/40 border-green-600 text-foreground dark:text-green-100",
    border: "border-green-600/70",
  },
  paid: {
    label: "Bezahlt",
    tone: "bg-amber-900/30 border-amber-600 text-foreground dark:text-amber-100",
    border: "border-amber-600/70",
  },
  canceled: {
    label: "Storniert",
    tone: "bg-red-900/30 border-red-600 text-foreground dark:text-red-100",
    border: "border-red-600/70",
  },
};

function DraggableReservationItem({
  reservation,
  children,
}: {
  reservation: Reservation;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: -reservation.id,
    data: { type: "reservation", reservationId: reservation.id },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

interface TableDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  table: Table | null;
  reservations: Reservation[];
  orders?: Order[];
  selectedDate: Date;
  onTableUpdated: () => void;
  onReservationClick: (reservation: Reservation) => void;
  onNewReservation: () => void;
  onReservationUpdated?: () => void;
  allowTableManagement?: boolean;
  forceEditMode?: boolean;
  showReservations?: boolean;
  onNotify?: (message: string, variant?: "info" | "success" | "error") => void;
  onHideTable?: (table: Table) => void;
  allowDaySpecificActions?: boolean;
  blocks?: Block[];
  tables?: Table[];
  blockAssignments?: BlockAssignment[];
  areas?: Area[];
  selectedAreaId?: string | null;
  onViewOrder?: (orderId: string) => void;
  onCreateOrder?: () => void;
}

export function TableDetailsDialog({
  open,
  onOpenChange,
  restaurantId,
  table,
  reservations,
  orders,
  selectedDate,
  onTableUpdated,
  onReservationClick,
  onNewReservation,
  onReservationUpdated,
  allowTableManagement = true,
  forceEditMode = false,
  showReservations = true,
  onNotify,
  onHideTable,
  allowDaySpecificActions = false,
  blocks = [],
  tables = [],
  blockAssignments = [],
  areas = [],
  selectedAreaId = null,
  onViewOrder,
  onCreateOrder,
}: TableDetailsDialogProps) {
  const editFormRef = useRef<HTMLFormElement | null>(null);
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [areaId, setAreaId] = useState<string | null>(selectedAreaId ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(allowTableManagement && forceEditMode);
  const [markingSeated, setMarkingSeated] = useState<string | null>(null);
  const [completingReservation, setCompletingReservation] = useState<string | null>(null);
  const [cancelingReservation, setCancelingReservation] = useState<string | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [editBlockDialogOpen, setEditBlockDialogOpen] = useState(false);
  const [editingBlocks, setEditingBlocks] = useState<Block[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const areaMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (table) {
      setNumber(table.number);
      setCapacity(table.capacity);
      setNotes(table.notes || "");
      setColor(table.color || "");
      setIsActive(table.is_active);
      setRotation(table.rotation || 0);
      setAreaId(table.area_id ?? selectedAreaId ?? null);
      setIsEditing(allowTableManagement && forceEditMode);
    } else {
      setAreaId(selectedAreaId ?? null);
    }
    setError("");
  }, [table, allowTableManagement, forceEditMode, open, selectedAreaId]);

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
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (areaMenuRef.current && !areaMenuRef.current.contains(event.target as Node)) {
        setAreaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!table) return;

    setError("");
    setLoading(true);
    let success = false;

    try {
      const data: TableUpdate = {
        number,
        capacity,
        notes: notes || null,
        is_active: isActive,
        color: color || null,
        rotation,
        area_id: areaId ?? null,
      };

      await tablesApi.update(restaurantId, table.id, data);
      onTableUpdated();
      setIsEditing(allowTableManagement && forceEditMode);
      success = true;
      onNotify?.("Tisch aktualisiert.", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Aktualisieren des Tisches");
      }
      onNotify?.("Fehler beim Aktualisieren des Tisches", "error");
    } finally {
      setLoading(false);
      if (success) {
        onOpenChange(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!table) return;

    if (!confirmAction(`Möchtest du Tisch ${table.number} wirklich löschen?`)) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await tablesApi.delete(restaurantId, table.id);
      onTableUpdated();
      onOpenChange(false);
      onNotify?.("Tisch gelöscht.", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Löschen des Tisches");
      }
      onNotify?.("Fehler beim Löschen des Tisches", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTempTable = async () => {
    if (!table) return;

    if (reservations.length > 0) {
      const ok = confirmAction(
        `Der temporäre Tisch ${table.number} hat ${reservations.length} Reservierung${reservations.length === 1 ? "" : "en"}. Diese werden als "Ausstehend" zurückgesetzt und der Tisch wird gelöscht. Fortfahren?`
      );
      if (!ok) {
        return;
      }
    } else if (!confirmAction(`Möchtest du den temporären Tisch ${table.number} wirklich löschen?`)) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const configId = String(table.id).replace("temp-", "");
      if (reservations.length > 0) {
        for (const reservation of reservations) {
          await reservationsApi.update(restaurantId, reservation.id, {
            table_id: null,
            status: "pending",
          });
          await reservationTableDayConfigsApi.delete(
            restaurantId,
            reservation.id,
            configId
          );
        }
        onNotify?.("Reservierungen wurden zurück in die Reservierungsübersicht verschoben.", "success");
      }
      await tableDayConfigsApi.deleteById(restaurantId, configId);
      onTableUpdated();
      onOpenChange(false);
      onNotify?.("Temporärer Tisch gelöscht.", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Löschen des temporären Tisches");
      }
      onNotify?.("Fehler beim Löschen des temporären Tisches", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (assignmentId: string) => {
    if (!confirmAction("Blockierung wirklich entfernen?")) {
      return;
    }

    setError("");
    setDeletingBlockId(assignmentId);
    try {
      await blockAssignmentsApi.delete(restaurantId, assignmentId);
      onTableUpdated();
      onNotify?.("Blockierung entfernt.", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Entfernen der Blockierung");
      }
      onNotify?.("Fehler beim Entfernen der Blockierung", "error");
    } finally {
      setDeletingBlockId(null);
    }
  };

  const getGroupedBlocks = (block: Block) => {
    return [block];
  };

  const handleMarkSeated = async (reservation: Reservation) => {
    setMarkingSeated(reservation.id);
    try {
      await reservationsApi.update(restaurantId, reservation.id, {
        status: "seated",
      });
      onNotify?.(
        `${reservation.guest_name || "Gast"} als Gäste da markiert.`,
        "success"
      );
      onReservationUpdated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Markieren als platziert");
      }
      onNotify?.("Fehler beim Markieren als platziert", "error");
    } finally {
      setMarkingSeated(null);
    }
  };

  const handleCompleteReservation = async (reservation: Reservation) => {
    setCompletingReservation(reservation.id);
    try {
      await reservationsApi.update(restaurantId, reservation.id, {
        status: "completed",
        table_id: null,
      });
      onNotify?.(
        `${reservation.guest_name || "Gast"} abgeschlossen.`,
        "success"
      );
      onReservationUpdated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Abschließen der Reservierung");
      }
      onNotify?.("Fehler beim Abschließen der Reservierung", "error");
    } finally {
      setCompletingReservation(null);
    }
  };

  const handleCancelReservation = async (reservation: Reservation) => {
    setCancelingReservation(reservation.id);
    try {
      await reservationsApi.update(restaurantId, reservation.id, {
        status: "canceled",
        table_id: null,
      });
      onNotify?.(`${reservation.guest_name || "Gast"} storniert.`, "success");
      onReservationUpdated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Stornieren der Reservierung");
      }
      onNotify?.("Fehler beim Stornieren der Reservierung", "error");
    } finally {
      setCancelingReservation(null);
    }
  };

  const { setNodeRef: setWaitlistDropRef, isOver: isOverWaitlist } = useDroppable({
    id: "waitlist-dropzone",
  });

  if (!table) return null;

  const activeReservations = reservations.filter(
    (r) => r.status === "confirmed" || r.status === "pending" || r.status === "seated"
  );
  const orderedActiveReservations = activeReservations
    .slice()
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const primaryReservation = orderedActiveReservations[0] ?? null;
  const primaryReservationId = primaryReservation?.id ?? null;
  const otherReservations = orderedActiveReservations.filter((r) => r.id !== primaryReservationId);
  const heroRemainingMinutes =
    primaryReservation?.status === "seated"
      ? Math.ceil((new Date(primaryReservation.end_at).getTime() - Date.now()) / 60000)
      : null;
  const heroRemainingLabel =
    typeof heroRemainingMinutes === "number"
      ? (() => {
          const abs = Math.abs(heroRemainingMinutes);
          const hours = Math.floor(abs / 60);
          const mins = abs % 60;
          const timeLabel = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
          return heroRemainingMinutes >= 0 ? `Noch ${timeLabel}` : `Überzogen ${timeLabel}`;
        })()
      : null;
  const heroTags =
    primaryReservation && Array.isArray(primaryReservation.tags)
      ? primaryReservation.tags.filter(Boolean)
      : [];
  const renderHeroTag = (tag: string) => {
    const normalized = tag.toLowerCase();
    const baseIconClasses = "w-3.5 h-3.5";
    const icon = (() => {
      switch (normalized) {
        case "vip":
          return <Star className={baseIconClasses} />;
        case "allergie":
          return <AlertTriangle className={baseIconClasses} />;
        case "geburtstag":
          return <Gift className={baseIconClasses} />;
        case "barrierefrei":
          return <Accessibility className={baseIconClasses} />;
        default:
          return null;
      }
    })();
    return (
      <span
        key={tag}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/20 text-[11px] font-semibold text-foreground dark:text-white shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
      >
        {icon}
        <span className="truncate">{tag}</span>
      </span>
    );
  };
  const heroNotes = primaryReservation?.notes || table.notes || "";
  const hasMultipleReservations = orderedActiveReservations.length > 1;

  const seatedReservation = activeReservations
    .filter((r) => r.status === "seated")
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];

  const confirmedReservation = !seatedReservation
    ? activeReservations
        .filter((r) => r.status === "confirmed")
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0]
    : null;

  const activeOrders = orders
    ? orders.filter((order) => order.status !== "paid" && order.status !== "canceled")
    : null;
  const primaryOrder =
    activeOrders && activeOrders.length > 0
      ? activeOrders
          .slice()
          .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())[0]
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onClose={() => onOpenChange(false)}
        showClose={false}
      >
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <DialogTitle>{table.number} · {table.capacity} Pers.</DialogTitle>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-md flex items-start justify-between gap-3">
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

          {typeof orders !== "undefined" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Bestellung</h3>
                <span className="text-xs text-muted-foreground">
                  {activeOrders && activeOrders.length > 0 ? `${activeOrders.length} aktiv` : "Keine aktiv"}
                </span>
              </div>
              {primaryOrder ? (
                <div
                  role={onViewOrder ? "button" : undefined}
                  tabIndex={onViewOrder ? 0 : undefined}
                  onClick={() => onViewOrder?.(primaryOrder.id)}
                  onKeyDown={(event) => {
                    if (!onViewOrder) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onViewOrder(primaryOrder.id);
                    }
                  }}
                  className={`rounded-xl border bg-background/60 px-4 py-3 text-foreground shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-colors ${
                    ORDER_STATUS_META[primaryOrder.status]?.border ?? "border-border"
                  } ${onViewOrder ? "cursor-pointer hover:bg-background/70 focus:outline-none focus:ring-2 focus:ring-border/70" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">
                      Bestellung {primaryOrder.order_number || `#${primaryOrder.id}`}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                        ORDER_STATUS_META[primaryOrder.status]?.tone ??
                        "border-white/10 bg-black/10 text-foreground dark:text-gray-200"
                      }`}
                    >
                      {ORDER_STATUS_META[primaryOrder.status]?.label ?? primaryOrder.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-muted-foreground text-sm">Keine aktive Bestellung.</p>
                  {onCreateOrder && (
                    <Button
                      type="button"
                      onClick={onCreateOrder}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary shadow-none hover:shadow-none transition-colors"
                    >
                      Bestellung erstellen
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {allowTableManagement && (isEditing || forceEditMode) && (
            <form ref={editFormRef} onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  {/* {allowTableManagement && ( }
                    <p className="text-xs text-muted-foreground">Tischnummer</p>
                  )} */
                  <p className="text-xs text-muted-foreground">Tischnummer</p>
                  }
                  <Input
                    placeholder="Tischnummer"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  {/* {allowTableManagement && (
                    <p className="text-xs text-muted-foreground">Max. Plätze</p>
                  )} */
                  <p className="text-xs text-muted-foreground">Max. Plätze</p>
                  }
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Kapazität"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              </div>
              {allowTableManagement && areas.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Area</p>
                  <div className="relative" ref={areaMenuRef}>
                    <button
                      type="button"
                      onClick={() => setAreaMenuOpen((prev) => !prev)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-card text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-inner"
                    >
                      <span className="truncate">
                        {areaId ? areas.find((a) => a.id === areaId)?.name || "Area auswählen" : "Area auswählen"}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${areaMenuOpen ? "rotate-180" : ""}`} />
                    </button>
                    {areaMenuOpen && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-xl max-h-60 overflow-auto">
                        {areas.map((area) => (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => {
                              setAreaId(area.id);
                              setAreaMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm ${
                              areaId === area.id
                                ? "font-semibold text-foreground"
                                : "text-foreground hover:bg-accent"
                            }`}
                          >
                            {area.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {/* {allowTableManagement && (
                  <p className="text-xs text-gray-400">Notizen</p>
                )} */
                <p className="text-xs text-muted-foreground">Notizen</p> }
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-card text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  rows={2}
                  placeholder="Notizen"
                />
              </div>
            <div className="space-y-2">
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Rotation ({rotation}°)</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="359"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value) || 0)}
                    className="w-full accent-primary"
                  />
                  <div className="w-20">
                    <label className="sr-only" htmlFor="rotation-input">Rotation</label>
                  <Input
                    id="rotation-input"
                    type="number"
                    min={0}
                    max={359}
                    step={1}
                    value={rotation}
                    onChange={(e) =>
                      setRotation(Math.min(359, Math.max(0, parseInt(e.target.value) || 0)))
                    }
                  />
                  </div>
                </div>
              </div>
              <label
                htmlFor="isActive"
                className="inline-flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm text-foreground cursor-pointer hover:border-primary"
              >
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isActive ? "bg-green-400" : "bg-muted-foreground"
                    }`}
                  />
                  {isActive ? "Tisch aktiv" : "Tisch inaktiv"}
                </span>
              </label>
            </form>
          )}

          {showReservations && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Reservierungen</h3>
                <span className="text-xs text-muted-foreground">{activeReservations.length} aktiv</span>
              </div>

              {primaryReservation && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onReservationClick(primaryReservation)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onReservationClick(primaryReservation);
                    }
                  }}
                  className="rounded-xl border border-emerald-500/60 bg-background/60 px-4 py-4 text-foreground shadow-[0_12px_28px_rgba(0,0,0,0.18)] hover:border-emerald-400/80 hover:bg-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-foreground" />
                      <span className="text-lg font-semibold text-foreground">
                        {format(new Date(primaryReservation.start_at), "HH:mm")} - {format(new Date(primaryReservation.end_at), "HH:mm")}
                      </span>
                      <span className="text-foreground font-semibold">• {primaryReservation.party_size} Pers.</span>
                    </div>
                    {heroRemainingLabel && (
                      <span className="text-xs text-foreground font-semibold">
                        {heroRemainingLabel}
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-md border border-emerald-400/60 bg-emerald-500/20 text-foreground dark:text-emerald-50 text-xs font-bold uppercase tracking-wide">
                      Aktive Reservierung
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 text-sm text-foreground">
                    <div className="text-lg font-semibold text-foreground">
                      {primaryReservation.guest_name || `Gast #${primaryReservation.guest_id || "unbekannt"}`}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-foreground/70 dark:text-white/70 font-semibold">Tags</span>
                        {heroTags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {heroTags.map((tag) => renderHeroTag(tag))}
                          </div>
                        ) : (
                          <span className="text-sm text-foreground/70 dark:text-white/70">Keine Tags</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-foreground/70 dark:text-white/70 font-semibold">Notizen</span>
                        {heroNotes ? (
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                            <p className="text-sm text-foreground dark:text-white leading-relaxed">
                              {heroNotes}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-foreground/70 dark:text-white/70">Keine Notizen</span>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full flex-row items-stretch gap-2 self-stretch pt-1">
                      {primaryReservation.status === "confirmed" && (
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkSeated(primaryReservation);
                          }}
                          disabled={markingSeated === primaryReservation.id}
                          className="h-full px-3 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary shadow-none hover:shadow-none transition-colors flex-1 order-last disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Gäste da
                        </Button>
                      )}
                      {(primaryReservation.status === "confirmed" || primaryReservation.status === "pending") && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirmAction("Reservierung wirklich stornieren?")) {
                              return;
                            }
                            handleCancelReservation(primaryReservation);
                          }}
                          disabled={cancelingReservation === primaryReservation.id}
                          className="h-full px-3 bg-transparent text-foreground border border-red-500 hover:bg-red-500/10 hover:text-foreground shadow-none transition-[shadow,background-color,color] flex-1 order-first disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Stornieren
                        </Button>
                      )}
                      {primaryReservation.status === "seated" && (
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirmAction("Möchtest du den Tisch freigeben und die Reservierung abschließen?")) {
                              return;
                            }
                            handleCompleteReservation(primaryReservation);
                          }}
                          disabled={completingReservation === primaryReservation.id}
                          className="h-full px-3 bg-green-600 hover:bg-green-500 text-white border border-green-500 shadow-none hover:shadow-[0_12px_32px_rgba(34,197,94,0.45)] transition-[shadow,background-color] flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Tisch freigeben
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeReservations.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Einträge</p>
              ) : (
                <div className="space-y-2">
                  {otherReservations.map((reservation) => {
                    const actionsDisabled = hasMultipleReservations && reservation.id !== primaryReservationId;
                    const remainingMinutes =
                      reservation.status === "seated"
                        ? Math.ceil((new Date(reservation.end_at).getTime() - Date.now()) / 60000)
                        : null;
                    const remainingLabel =
                      typeof remainingMinutes === "number"
                        ? (() => {
                            const abs = Math.abs(remainingMinutes);
                            const hours = Math.floor(abs / 60);
                            const mins = abs % 60;
                            const timeLabel = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
                            return remainingMinutes >= 0 ? `Noch ${timeLabel}` : `Überzogen ${timeLabel}`;
                          })()
                        : null;
                    return (
                    <DraggableReservationItem key={reservation.id} reservation={reservation}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onReservationClick(reservation)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onReservationClick(reservation);
                          }
                        }}
                        className={`w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring border-border`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold text-foreground">
                              {format(new Date(reservation.start_at), "HH:mm")} - {format(new Date(reservation.end_at), "HH:mm")}
                            </span>
                            <span className="text-foreground">• {reservation.party_size} Pers.</span>
                          </div>
                          {reservation.status === "seated" && remainingLabel && (
                            <span className="text-xs text-foreground">{remainingLabel}</span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-col gap-2 text-sm text-foreground">
                          <span className="font-medium text-foreground">
                            {reservation.guest_name || `Gast #${reservation.guest_id || "unbekannt"}`}
                          </span>
                          <div className="flex w-full flex-row items-stretch gap-2 self-stretch">
                            {reservation.status === "confirmed" && (
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkSeated(reservation);
                                }}
                                disabled={markingSeated === reservation.id || actionsDisabled}
                                className="h-full min-h-[44px] px-3 bg-primary hover:bg-primary/90 text-primary-foreground border border-primary shadow-none hover:shadow-none transition-colors flex-1 order-last disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Gäste da
                              </Button>
                            )}
                            {reservation.status === "confirmed" && (
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!confirmAction("Reservierung wirklich stornieren?")) {
                                    return;
                                  }
                                  handleCancelReservation(reservation);
                                }}
                                disabled={cancelingReservation === reservation.id || actionsDisabled}
                                className="h-full min-h-[44px] px-3 bg-transparent text-foreground border border-red-500 hover:bg-red-500/10 hover:text-foreground shadow-none transition-[shadow,background-color,color] flex-1 order-first disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Stornieren
                              </Button>
                            )}
                            {reservation.status === "seated" && (
                              <Button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!confirmAction("Möchtest du den Tisch freigeben und die Reservierung abschließen?")) {
                                    return;
                                  }
                                  handleCompleteReservation(reservation);
                                }}
                                disabled={completingReservation === reservation.id || actionsDisabled}
                                className="h-full min-h-[44px] px-3 bg-green-600 hover:bg-green-500 text-white border border-green-500 shadow-none hover:shadow-[0_12px_32px_rgba(34,197,94,0.45)] transition-[shadow,background-color] flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Tisch freigeben
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </DraggableReservationItem>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {table && blocks && (
          <div className="px-4 md:px-6 pb-5">
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Blockierungen</h3>
                <span className="text-xs text-muted-foreground">
                  {blockAssignments.filter((assignment) => assignment.table_id === table.id).length} aktiv
                </span>
              </div>
              {blockAssignments.filter((assignment) => assignment.table_id === table.id).length === 0 ? (
                <div className="mt-2 text-sm text-muted-foreground">Keine Blockierungen für diesen Tisch.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {blockAssignments
                    .filter((assignment) => assignment.table_id === table.id)
                    .map((assignment) => {
                      const block = blocks.find((item) => item.id === assignment.block_id);
                      if (!block) return null;
                      return { assignment, block };
                    })
                    .filter((entry): entry is { assignment: BlockAssignment; block: Block } => !!entry)
                    .sort((a, b) => new Date(a.block.start_at).getTime() - new Date(b.block.start_at).getTime())
                    .map(({ assignment, block }) => (
                      <div
                        key={assignment.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setEditingBlock(block);
                          setEditingBlocks(getGroupedBlocks(block));
                          setEditBlockDialogOpen(true);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setEditingBlock(block);
                            setEditingBlocks(getGroupedBlocks(block));
                            setEditBlockDialogOpen(true);
                          }
                        }}
                        className="flex items-center justify-between gap-3 rounded-lg border border-red-600/70 bg-background/60 px-3 py-2.5 text-sm text-red-50 shadow-md hover:shadow-lg hover:bg-accent transition-all cursor-pointer"
                      >
                        <div className="min-w-0">
                          {block.reason && (
                            <div className="text-sm font-semibold text-rose-100 truncate">
                              {block.reason}
                            </div>
                          )}
                          <div className="text-sm font-medium text-foreground">
                            {format(new Date(block.start_at), "dd.MM.yyyy HH:mm")} –{" "}
                            {format(new Date(block.end_at), "HH:mm")}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteBlock(assignment.id);
                          }}
                          disabled={deletingBlockId === assignment.id}
                          className="min-h-[36px] px-3 shadow-none hover:shadow-[0_10px_24px_rgba(239,68,68,0.35)]"
                        >
                          Entfernen
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="flex flex-wrap items-center gap-2 mr-auto">
            {allowTableManagement && (currentUser?.role === "platform_admin" || currentUser?.role === "owner" || currentUser?.role === "manager") && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="min-w-[150px] whitespace-nowrap shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.45)]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Tisch löschen
              </Button>
            )}
          </div>
          {allowTableManagement && (isEditing || forceEditMode) && (
            <Button
              type="button"
              onClick={() => editFormRef.current?.requestSubmit()}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Save className="w-4 h-4 animate-spin" />
                  <span>Speichern...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Speichern</span>
                </>
              )}
            </Button>
          )}
          {allowDaySpecificActions && table && (currentUser?.role === "platform_admin" || currentUser?.role === "owner" || currentUser?.role === "manager") && (
            String(table.id).startsWith("temp-") ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteTempTable}
                disabled={loading}
                className="shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.45)]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Temporären Tisch löschen
              </Button>
            ) : null
          )}
          <div className="w-full flex flex-wrap items-center gap-2">
            {allowDaySpecificActions && table && !String(table.id).startsWith("temp-") && onHideTable && (currentUser?.role === "platform_admin" || currentUser?.role === "owner" || currentUser?.role === "manager") && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onHideTable(table);
                  onOpenChange(false);
                }}
                disabled={loading}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Für diesen Tag ausblenden
              </Button>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Schließen
              </Button>
              {!allowTableManagement && showReservations && (
                <Button type="button" onClick={onNewReservation}>
                  <Plus className="w-4 h-4 mr-2" />
                  Neue Reservierung
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
        {table && !String(table.id).startsWith("temp-") && (
          <BlockTableDialog
            open={editBlockDialogOpen}
            onOpenChange={(open) => {
              setEditBlockDialogOpen(open);
              if (!open) {
                setEditingBlock(null);
                setEditingBlocks([]);
              }
            }}
            restaurantId={restaurantId}
            tables={
              editingBlock
                ? tables.filter((t) =>
                    blockAssignments.some(
                      (assignment) => assignment.block_id === editingBlock.id && assignment.table_id === t.id
                    )
                  )
                : [table]
            }
            block={editingBlock}
            blocks={editingBlocks}
            blockAssignments={blockAssignments}
            selectedDate={selectedDate}
            onBlockCreated={onTableUpdated}
            onNotify={onNotify}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
