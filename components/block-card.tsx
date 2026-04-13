"use client";

import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { Ban, Clock } from "lucide-react";
import type { Block } from "@/lib/api/blocks";

interface BlockCardProps {
  block: Block;
  isDragging?: boolean;
  draggable?: boolean;
  tableLabels?: string[];
  onClick?: (block: Block) => void;
}

export function BlockCard({ block, isDragging, draggable = true, tableLabels, onClick }: BlockCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `block-${block.id}`,
    data: { type: "block", blockId: block.id },
    disabled: !draggable,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const startDate = new Date(block.start_at);
  const endDate = new Date(block.end_at);
  const label = block.reason || "Blockiert";
  const uniqueTables = tableLabels?.filter(Boolean) ?? [];
  const tableLabelText = (() => {
    if (uniqueTables.length === 0) return null;
    const head = uniqueTables.slice(0, 2).join(", ");
    const rest = uniqueTables.length - 2;
    return rest > 0 ? `${head} +${rest}` : head;
  })();

  return (
    <div
      ref={setNodeRef}
      data-dnd-draggable="true"
      style={{
        ...style,
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        touchAction: "none",
        WebkitTouchCallout: "none",
      }}
      onClick={() => onClick?.(block)}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      className={`
        bg-card rounded-lg shadow-md border border-border p-2 md:p-3
        ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
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
        </div>
        <span
          className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-md border border-rose-600/70 bg-rose-900/50 text-rose-100 shadow-[0_6px_14px_rgba(0,0,0,0.3)]"
          title="Block"
          aria-label="Block"
        >
          <Ban className="w-4 h-4" />
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm text-foreground">
        <span className="font-medium text-foreground">{label}</span>
        {tableLabelText && (
          <span className="text-xs text-rose-200 font-medium">
            {tableLabelText}
          </span>
        )}
      </div>
    </div>
  );
}
