import { useDraggable } from "@dnd-kit/core";
import { Obstacle } from "@/lib/api/obstacles";
import { ShieldAlert } from "lucide-react";

interface ObstacleCardProps {
  obstacle: Obstacle;
  onClick?: () => void;
  isDragging?: boolean;
}

export function ObstacleCard({ obstacle, onClick, isDragging }: ObstacleCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `obstacle-${obstacle.id}`,
  });

  const dragTransform = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : "";
  const baseTransform = `rotate(${obstacle.rotation || 0}deg)`;
  const combinedTransform = `${baseTransform} ${dragTransform}`.trim();
  const bgColor = obstacle.color || "rgba(55,65,81,0.85)";

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "door":
        return "Tür";
      case "stairs":
        return "Treppe";
      case "kitchen":
        return "Küche";
      case "bar":
        return "Bar";
      case "wall":
        return "Wand";
      case "other":
        return "Sonstiges";
      default:
        return type;
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      data-dnd-draggable="true"
      className={`
        group rounded-md border border-gray-700/70 shadow-[0_10px_24px_rgba(0,0,0,0.35)]
        flex items-center justify-center text-xs font-semibold text-white cursor-grab
        hover:shadow-[0_12px_30px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 transition-all
        ${isDragging ? "opacity-60" : ""}
      `}
      style={{
        left: obstacle.x,
        top: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
        position: "absolute",
        pointerEvents: "auto",
        backgroundColor: bgColor,
        transform: combinedTransform || undefined,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'none',
      }}
      onMouseDown={(e) => {
        // Verhindere Text-Selektion beim Doppelklick
        if (e.detail > 1) e.preventDefault();
      }}
    >
      <div className="flex items-center gap-1 px-2">
        <ShieldAlert className="w-4 h-4 opacity-80" />
        <span className="truncate">{obstacle.name || getTypeLabel(obstacle.type)}</span>
      </div>
    </div>
  );
}
