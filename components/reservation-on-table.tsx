"use client";

import { useDraggable } from "@dnd-kit/core";
import { Reservation } from "@/lib/api/reservations";
import { format } from "date-fns";
import { Clock, Users, X } from "lucide-react";

interface ReservationOnTableProps {
  reservation: Reservation;
  onClick?: (e?: React.MouseEvent) => void;
  onRemove?: () => void;
  isDragging?: boolean;
}

export function ReservationOnTable({ reservation, onClick, onRemove, isDragging }: ReservationOnTableProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`
        mb-2 pb-2 border-b border-border last:border-0
        cursor-grab active:cursor-grabbing
        hover:bg-card rounded px-2 py-1
        ${isDragging ? "opacity-50" : ""}
        touch-manipulation
        relative z-[101]
      `}
    >
      <div className="flex items-center gap-2 text-foreground">
        <Clock className="w-3 h-3" />
        <span>
          {format(startDate, "HH:mm")} - {format(new Date(reservation.end_at), "HH:mm")}
        </span>
      </div>
      <div className="mt-1 text-foreground">
        {reservation.guest_name || `Gast #${reservation.guest_id || "unbekannt"}`} -{" "}
        {reservation.party_size} {reservation.party_size === 1 ? "Person" : "Personen"}
      </div>
      <div className="mt-1 text-muted-foreground text-xs">Status: {reservation.status}</div>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="mt-2 w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition-colors touch-manipulation min-h-[36px] flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" />
          Vom Tisch entfernen
        </button>
      )}
    </div>
  );
}

