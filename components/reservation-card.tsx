"use client";

import { useDraggable } from "@dnd-kit/core";
import { Reservation } from "@/lib/api/reservations";
import { format } from "date-fns";
import { Clock, Users, CheckCircle, XCircle, AlertTriangle, Armchair, ShieldCheck } from "lucide-react";

interface ReservationCardProps {
  reservation: Reservation;
  isDragging?: boolean;
  getTableName?: (tableId: string | null) => string;
  getTableLabel?: (reservation: Reservation) => string | null;
  onClick?: (reservation: Reservation) => void;
  onDelete?: (reservation: Reservation) => void;
}

export function ReservationCard({
  reservation,
  isDragging,
  getTableName,
  getTableLabel,
  onClick,
  onDelete,
}: ReservationCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `reservation-${reservation.id}`,
    data: { type: "reservation", reservationId: reservation.id },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const startDate = new Date(reservation.start_at);
  const endDate = new Date(reservation.end_at);

  const STATUS_ICON_MAP: Record<
    Reservation["status"],
    { Icon: typeof Clock; tone: string; label: string }
  > = {
    pending: { Icon: Clock, tone: "bg-blue-900/40 border-blue-600 text-blue-100", label: "Ausstehend" },
    confirmed: { Icon: ShieldCheck, tone: "bg-indigo-900/40 border-indigo-600 text-indigo-100", label: "Bestätigt" },
    seated: { Icon: Armchair, tone: "bg-emerald-900/40 border-emerald-600 text-emerald-100", label: "Platziert" },
    completed: { Icon: CheckCircle, tone: "bg-amber-900/30 border-amber-600 text-amber-100", label: "Abgeschlossen" },
    canceled: { Icon: XCircle, tone: "bg-red-900/30 border-red-600 text-red-100", label: "Storniert" },
    no_show: { Icon: AlertTriangle, tone: "bg-orange-900/30 border-orange-600 text-orange-100", label: "No-Show" },
  };

  const getStatusIcon = (status: Reservation["status"]) => {
    const entry = STATUS_ICON_MAP[status] || STATUS_ICON_MAP.pending;
    return {
      icon: <entry.Icon className="w-4 h-4 text-foreground dark:text-current" />,
      className: `inline-flex items-center justify-center w-8 h-8 rounded-md border ${entry.tone}`,
      label: entry.label,
    };
  };

  const statusIcon = getStatusIcon(reservation.status);

  return (
    <div
      ref={setNodeRef}
      data-dnd-draggable="true"
      style={{
        ...style,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
      }}
      {...listeners}
      {...attributes}
      onMouseDown={(e) => {
        // Verhindere Text-Selektion beim Maus-Down (Doppelklick)
        if (e.detail > 1) e.preventDefault();
      }}
      onClick={() => onClick?.(reservation)}
      className={`
        bg-card rounded-lg shadow-md border border-border p-2 md:p-3
        cursor-grab active:cursor-grabbing
        hover:shadow-lg hover:bg-accent transition-all
        ${isDragging ? "opacity-50" : ""}
        touch-manipulation
        select-none
        min-h-[70px]
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
          <Clock className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">
            {format(startDate, "HH:mm")} – {format(endDate, "HH:mm")} Uhr
          </span>
          <span className="text-foreground">• {reservation.party_size} Pers.</span>
        </div>
        <span
          className={`${statusIcon.className} shadow-[0_6px_14px_rgba(0,0,0,0.3)] w-7 h-7 md:w-8 md:h-8`}
          title={statusIcon.label}
          aria-label={statusIcon.label}
        >
          {statusIcon.icon}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm text-foreground">
        <span className="font-medium text-foreground">
          {reservation.guest_name || "Unbekannt"}
        </span>
        {(() => {
          const label = getTableLabel?.(reservation);
          if (label) {
            return (
              <span className="text-xs text-primary font-medium">
                {label}
              </span>
            );
          }
          if (!reservation.table_id) return null;
          return (
            <span className="text-xs text-primary font-medium">
              {getTableName ? getTableName(reservation.table_id) : reservation.table_id}
            </span>
          );
        })()}
      </div>

      {reservation.notes && (
        <p className="mt-2 text-xs md:text-sm text-foreground italic line-clamp-2">
          {reservation.notes}
        </p>
      )}
    </div>
  );
}

