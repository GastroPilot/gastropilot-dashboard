"use client";

import { cn } from "@/lib/utils";

interface SkeletonTableCardProps {
  count?: number;
  width?: number;
  height?: number;
  className?: string;
}

export function SkeletonTableCard({
  count = 1,
  width = 120,
  height = 120,
  className,
}: SkeletonTableCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg border border-border bg-card animate-pulse relative shadow-[0_10px_24px_rgba(0,0,0,0.35)]",
            className
          )}
          style={{ width: `${width}px`, height: `${height}px` }}
          role="status"
          aria-label="Lädt Tischkarte..."
        >
          {/* Header placeholder - matches TableCard header */}
          <div className="absolute top-0 left-0 right-0 rounded-t-lg border-b border-border bg-muted/80 h-10" />

          {/* Center content placeholder - matches table number/status display */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-12 h-6 bg-muted rounded" />
          </div>

          {/* Bottom progress bar placeholder */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[90%]">
            <div className="h-1.5 w-full rounded-full bg-muted" />
            <div className="text-[10px] h-3 mt-1 bg-muted rounded w-20 ml-auto" />
          </div>
        </div>
      ))}
    </>
  );
}
