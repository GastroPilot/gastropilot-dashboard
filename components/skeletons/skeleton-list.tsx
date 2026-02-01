"use client";

import { cn } from "@/lib/utils";
import { SkeletonBase } from "./skeleton-base";

interface SkeletonListProps {
  rows?: number;
  itemHeight?: number;
  spacing?: number;
  className?: string;
}

export function SkeletonList({
  rows = 5,
  itemHeight = 60,
  spacing = 12,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Lädt Liste...">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg bg-gray-900 p-4 border border-gray-800 animate-pulse"
          style={{ minHeight: `${itemHeight}px`, marginBottom: `${spacing}px` }}
        >
          <div className="space-y-2">
            <SkeletonBase width="70%" height="18px" rounded="sm" />
            <SkeletonBase width="50%" height="16px" rounded="sm" />
            <SkeletonBase width="40%" height="14px" rounded="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
