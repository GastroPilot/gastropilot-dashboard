"use client";

import { useState, useEffect } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Table } from "@/lib/api/tables";
import { Reservation } from "@/lib/api/reservations";
import { Order, OrderStatus } from "@/lib/api/orders";
import { format } from "date-fns";
import { Users, Clock, Check, Link, Crown, AlertTriangle, PartyPopper, Accessibility, Ban, ShoppingCart, CheckCircle, Euro, X } from "lucide-react";
import { ReservationOnTable } from "./reservation-on-table";

interface TablePosition {
  x: number;
  y: number;
}

const ORDER_BADGE_META: Record<OrderStatus, { label: string; tone: string; Icon: typeof Clock }> = {
  open: { label: "Offen", tone: "bg-blue-600 border-blue-400 text-white", Icon: Clock },
  sent_to_kitchen: { label: "An Küche gesendet", tone: "bg-indigo-600 border-indigo-400 text-white", Icon: ShoppingCart },
  in_preparation: { label: "In Zubereitung", tone: "bg-yellow-500 border-yellow-300 text-white", Icon: Clock },
  ready: { label: "Fertig", tone: "bg-emerald-600 border-emerald-400 text-white", Icon: CheckCircle },
  served: { label: "Serviert", tone: "bg-green-600 border-green-400 text-white", Icon: CheckCircle },
  paid: { label: "Bezahlt", tone: "bg-amber-500 border-amber-300 text-gray-900", Icon: Euro },
  canceled: { label: "Storniert", tone: "bg-red-600 border-red-400 text-white", Icon: X },
};

interface TableCardProps {
  table: Table;
  reservations: Reservation[];
  orders?: Order[];
  position: TablePosition;
  onClick: () => void;
  onReservationClick?: (reservation: Reservation) => void;
  onReservationRemove?: (reservation: Reservation) => void;
  isDragging?: boolean;
  allowDragging?: boolean;
  allowDraggingWithReservations?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  selectedDate?: Date;
  blockStatus?: { isBlockedNow: boolean; isBlocked: boolean; timeRange?: string; reason?: string };
}

export function TableCard({
  table,
  reservations,
  orders = [],
  position,
  onClick,
  onReservationClick,
  onReservationRemove,
  isDragging,
  allowDragging = true,
  allowDraggingWithReservations = false,
  selectionMode = false,
  isSelected = false,
  selectedDate,
  blockStatus,
}: TableCardProps) {
  const activeReservations = reservations.filter(
    (r) => r.status === "confirmed" || r.status === "seated"
  );
  const activeOrders = (orders || []).filter(
    (o) => o.status !== "paid" && o.status !== "canceled"
  );
  const hasReadyOrders = activeOrders.some((order) => order.status === "ready");
  const primaryOrder =
    activeOrders.length > 0
      ? activeOrders
          .slice()
          .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())[0]
      : null;
  const orderBadge = primaryOrder ? ORDER_BADGE_META[primaryOrder.status] : null;
  const isInactive = !table.is_active;
  const selectedDateKey = selectedDate ? selectedDate.toDateString() : "today";
  const getReferenceNow = () => {
    const base = new Date(selectedDate ?? new Date());
    const realNow = new Date();
    base.setHours(realNow.getHours(), realNow.getMinutes(), realNow.getSeconds(), realNow.getMilliseconds());
    return base.getTime();
  };

  const [nowTs, setNowTs] = useState(() => getReferenceNow());

  // Nächste anstehende Reservierung finden (bevorzugt in der Zukunft, sonst früheste)
  const nextReservation = (() => {
    if (activeReservations.length === 0) return null;
    const now = new Date();
    const upcoming = activeReservations
      .filter((r) => new Date(r.start_at) >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    if (upcoming.length > 0) return upcoming[0];
    return activeReservations
      .slice()
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];
  })();

  // Disable table dragging if explicitly disabled, in selection mode, or if there are active reservations (unless allowed)
  const isTableDraggingDisabled =
    selectionMode || !allowDragging || (!allowDraggingWithReservations && activeReservations.length > 0);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: table.id,
    data: { type: "table", tableId: table.id },
    disabled: isDragging || isTableDraggingDisabled, // Disable table dragging when there are reservations
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: table.id,
  });

  const [tooltipPosition, setTooltipPosition] = useState<{
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  }>({ vertical: 'bottom', horizontal: 'center' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Berechne optimale Tooltip-Position
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const tooltipHeight = 200; // Geschätzte Höhe des Tooltips
    const tooltipWidth = 256; // 64 * 4 = 256px (w-64)
    
    // Vertikale Position: oben wenn Tisch unten, unten wenn Tisch oben
    const vertical = position.y > viewportHeight - 300 ? 'top' : 'bottom';
    
    // Horizontale Position: links wenn Tisch links, rechts wenn Tisch rechts, sonst zentriert
    let horizontal: 'left' | 'center' | 'right' = 'center';
    if (position.x < tooltipWidth / 2) {
      horizontal = 'left';
    } else if (position.x > viewportWidth - tooltipWidth / 2) {
      horizontal = 'right';
    }
    
    setTooltipPosition({ vertical, horizontal });
  }, [position.x, position.y]);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${table.rotation || 0}deg)`,
      }
    : { transform: `rotate(${table.rotation || 0}deg)` };

  const width = table.width || 120;
  const height = table.height || 120;

  useEffect(() => {
    const computeReferenceNow = () => {
      const base = new Date(selectedDate ?? new Date());
      const realNow = new Date();
      base.setHours(realNow.getHours(), realNow.getMinutes(), realNow.getSeconds(), realNow.getMilliseconds());
      return base.getTime();
    };
    setNowTs(computeReferenceNow());
    const id = setInterval(() => setNowTs(computeReferenceNow()), 10000);
    return () => clearInterval(id);
  }, [selectedDateKey, selectedDate]);

  const currentReservation = (() => {
    const now = nowTs;
    return (
      activeReservations
        .filter((r) => {
          const start = new Date(r.start_at).getTime();
          return r.status === "seated" || now >= start;
        })
        .sort((a, b) => new Date(a.end_at).getTime() - new Date(b.end_at).getTime())[0] || null
    );
  })();

  const upcomingReservation = (() => {
    const now = nowTs;
    return (
      activeReservations
        .filter((r) => new Date(r.start_at).getTime() > now)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] || null
    );
  })();

  const remainingMsCurrent =
    currentReservation?.end_at ? new Date(currentReservation.end_at).getTime() - nowTs : null;
  const isOverdue = typeof remainingMsCurrent === "number" ? remainingMsCurrent <= 0 : false;
  const finishingSoon =
    typeof remainingMsCurrent === "number" && remainingMsCurrent > 0 && remainingMsCurrent <= 15 * 60 * 1000;

  // Status-Akzent für linken Rand (neues Design: Karte einheitlich, Status nur als Akzent)
  const statusAccent = (() => {
    if (!table.is_active) return "border-l-muted-foreground/50";
    if (blockStatus?.isBlocked) return "border-l-destructive";
    if (isOverdue) return "border-l-destructive";
    if (finishingSoon) return "border-l-amber-500";
    if (currentReservation) return "border-l-primary";
    const upcomingSoon =
      upcomingReservation && new Date(upcomingReservation.start_at).getTime() - nowTs <= 30 * 60 * 1000;
    if (upcomingSoon) return "border-l-emerald-500";
    return "border-l-muted-foreground/40";
  })();

  const tagSource = currentReservation || upcomingReservation;
  const tagLabels = tagSource?.tags?.filter(Boolean) ?? [];

  const renderTagBadge = (tag?: string, extraClass = "") => {
    if (!tag) return null;
    const base = "inline-flex items-center justify-center rounded-full border p-1.5 shadow-lg text-white";
    switch (tag.toLowerCase()) {
      case "vip":
        return (
          <span className={`${base} bg-amber-500 border-amber-300 ${extraClass}`} title="VIP">
            <Crown className="w-3.5 h-3.5" />
          </span>
        );
      case "allergie":
        return (
          <span className={`${base} bg-red-500 border-red-300 ${extraClass}`} title="Allergie">
            <AlertTriangle className="w-3.5 h-3.5" />
          </span>
        );
      case "geburtstag":
        return (
          <span className={`${base} bg-pink-500 border-pink-300 ${extraClass}`} title="Geburtstag">
            <PartyPopper className="w-3.5 h-3.5" />
          </span>
        );
      case "barrierefrei":
        return (
          <span className={`${base} bg-emerald-500 border-emerald-300 ${extraClass}`} title="Barrierefrei">
            <Accessibility className="w-3.5 h-3.5" />
          </span>
        );
      default:
        return null;
    }
  };

  const remainingInfo = (() => {
    if (!currentReservation) return null;
    const start = new Date(currentReservation.start_at).getTime();
    const end = new Date(currentReservation.end_at).getTime();
    const total = Math.max(end - start, 1);
    const remainingRaw = end - nowTs;
    const remaining = Math.abs(remainingRaw);
    const isOver = remainingRaw < 0;
    const fractionLeft = Math.max(0, Math.min(1, remainingRaw / total));

    const formatRemaining = (ms: number) => {
      const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      if (hours > 0) return `${hours}h ${minutes}min`;
      return `${minutes}min`;
    };

    const gradientClasses =
      fractionLeft > 0.5 && !isOver
        ? "from-emerald-400/90 via-emerald-500/80 to-emerald-500/80 text-emerald-50 border-emerald-300/50"
        : fractionLeft > 0.2 && !isOver
        ? "from-amber-400/90 via-amber-500/80 to-amber-500/80 text-amber-50 border-amber-300/50"
        : "from-rose-400/95 via-rose-500/85 to-rose-500/80 text-rose-50 border-rose-300/60";

    const barColor =
      fractionLeft > 0.5 && !isOver
        ? "bg-emerald-400"
        : fractionLeft > 0.2 && !isOver
        ? "bg-amber-400"
        : "bg-rose-400";

    return {
      remainingLabel: `${isOver ? "-" : ""}${formatRemaining(remaining)}`,
      startLabel: format(new Date(currentReservation.start_at), "HH:mm"),
      endLabel: format(new Date(currentReservation.end_at), "HH:mm"),
      progress: isOver ? 1 : Math.min(1, Math.max(0, 1 - fractionLeft)),
      gradientClasses,
      barColor,
    };
  })();

  const upcomingDisplay = (() => {
    if (remainingInfo) return null;
    const candidate =
      upcomingReservation ||
      activeReservations
        .filter((r) => r.status === "confirmed")
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0];
    if (!candidate) return null;
    const start = new Date(candidate.start_at);
    const end = new Date(candidate.end_at);
    const baseViewDate = selectedDate ?? new Date();
    const viewDate = new Date(baseViewDate.getTime());
    const isSameDay =
      start.getFullYear() === viewDate.getFullYear() &&
      start.getMonth() === viewDate.getMonth() &&
      start.getDate() === viewDate.getDate();
    if (!isSameDay) return null;

    const today = new Date();
    const isSelectedDateToday =
      viewDate.getFullYear() === today.getFullYear() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getDate() === today.getDate();

    const minutesUntil = Math.max(0, Math.round((start.getTime() - nowTs) / 60000));
    return {
      startLabel: format(start, "HH:mm"),
      endLabel: format(end, "HH:mm"),
      minutesUntil: isSelectedDateToday ? minutesUntil : undefined,
    };
  })();

  // Backward compatibility for any legacy references
  const upcomingTodayInfo = upcomingDisplay;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDroppableRef(node);
      }}
      data-dnd-draggable="true"
      data-dnd-droppable="true"
      style={{
        ...style,
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        cursor: isInactive ? "not-allowed" : isTableDraggingDisabled ? "default" : (isDragging ? "grabbing" : "grab"),
        pointerEvents: 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
      }}
      {...(!isTableDraggingDisabled ? { ...listeners, ...attributes } : {})}
      onMouseDown={(e) => {
        // Verhindere Text-Selektion beim Maus-Down (Doppelklick)
        if (e.detail > 1) e.preventDefault();
      }}
      onClick={onClick}
      className={`
        rounded-lg border border-border bg-card text-card-foreground
        border-l-4 ${statusAccent}
        shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition-all duration-200
        hover:scale-105 hover:shadow-[0_12px_30px_rgba(0,0,0,0.45)]
        flex flex-col items-center justify-center
        ${isDragging ? "opacity-50" : ""}
        ${isOver ? "ring-4 ring-primary ring-offset-2 scale-110" : ""}
        ${isInactive ? "opacity-80 saturate-75" : ""}
        ${isSelected ? "ring-4 ring-ring ring-offset-2" : ""}
        ${hasReadyOrders ? "outline outline-2 outline-emerald-400 outline-offset-2" : ""}
        ${selectionMode ? "cursor-pointer" : ""}
        group
        relative z-20
        select-none
      `}
    >
      {selectionMode && (
        <div className="absolute top-2 left-2 z-30">
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
            isSelected 
              ? "bg-primary border-primary"
              : "bg-card/80 border-input"
          }`}>
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>
      )}
      {orderBadge && (
        <div className="pointer-events-none absolute -top-3 -right-3 z-30">
          <div
            className={`inline-flex items-center rounded-full border p-1.5 shadow-lg ${orderBadge.tone}`}
            aria-label={`Bestellung ${orderBadge.label}`}
          >
            <orderBadge.Icon className="w-4 h-4" />
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute top-0 left-0 right-0 px-0 rounded-t-lg border-b border-border bg-muted/80">
        <div className="flex items-center justify-between gap-3 px-3 py-2 overflow-hidden whitespace-nowrap">
          <span className="flex items-center gap-0.5 relative text-foreground">
            <span className="text-sm font-semibold">{table.number}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
            <Users className="w-4 h-4" />
            {table.capacity}
          </span>
        </div>
      </div>

      {isInactive && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-dashed border-muted-foreground/60" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="px-3 py-1 rounded-full text-[12px] font-semibold bg-background/80 border border-input text-foreground shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
              Deaktiviert
            </div>
          </div>
        </>
      )}
      {blockStatus?.isBlockedNow && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-foreground">
          {blockStatus.reason && (
            <span className="text-xs font-semibold opacity-90">
              {blockStatus.reason}
            </span>
          )}
          <span className="inline-flex items-center gap-2 text-sm font-semibold tabular-nums opacity-90">
            <Ban className="w-4 h-4" />
            {blockStatus.timeRange || "Blockiert"}
          </span>
        </div>
      )}
      {remainingInfo && !blockStatus?.isBlockedNow && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-2 text-sm font-semibold tabular-nums text-foreground opacity-85">
            <Clock className="w-4 h-4" />
            {remainingInfo.remainingLabel}
          </span>
        </div>
      )}
      {!remainingInfo && !blockStatus?.isBlockedNow && upcomingDisplay && typeof upcomingDisplay.minutesUntil === "number" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-2 text-sm font-semibold tabular-nums text-foreground opacity-85">
            <Clock className="w-4 h-4" />
            in {upcomingDisplay.minutesUntil}min
          </span>
        </div>
      )}
      {table.join_group_id && (
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-semibold text-foreground shadow-sm whitespace-nowrap">
            <Link className="w-3 h-3" />
            Gruppe {table.join_group_id}
          </span>
        </div>
      )}
      {remainingInfo && !blockStatus?.isBlockedNow && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none flex flex-col gap-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${remainingInfo.barColor}`}
              style={{ width: `${Math.round(remainingInfo.progress * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-right text-muted-foreground">
            {remainingInfo.startLabel} – {remainingInfo.endLabel}
          </div>
        </div>
      )}
      {tagLabels.length > 0 && (
        <div className="pointer-events-none absolute -top-3 -left-3 z-30 flex items-center">
          {tagLabels.map((tag, index) => (
            <div key={`${tag}-${index}`} className={index === 0 ? "" : "-ml-2"}>
              {renderTagBadge(tag)}
            </div>
          ))}
        </div>
      )}
      {!remainingInfo && !blockStatus?.isBlockedNow && upcomingDisplay && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none flex flex-col gap-1">
          <div className="text-[10px] text-right text-muted-foreground">
            {upcomingDisplay.startLabel} – {upcomingDisplay.endLabel}
          </div>
        </div>
      )}
      {blockStatus?.isBlocked && !blockStatus.isBlockedNow && blockStatus.timeRange && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-foreground">
          {blockStatus.reason && (
            <span className="text-xs font-semibold opacity-85">
              {blockStatus.reason}
            </span>
          )}
          <span className="inline-flex items-center gap-2 text-sm font-semibold tabular-nums opacity-85">
            <Ban className="w-4 h-4" />
            {blockStatus.timeRange}
          </span>
        </div>
      )}

    </div>
  );
}
