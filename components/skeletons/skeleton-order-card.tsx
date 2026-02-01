"use client";

import { cn } from "@/lib/utils";
import { SkeletonBase } from "./skeleton-base";

interface SkeletonOrderCardProps {
  count?: number;
  className?: string;
}

export function SkeletonOrderCard({
  count = 1,
  className,
}: SkeletonOrderCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg bg-gray-900 p-4 border border-gray-800 animate-pulse",
            className
          )}
          role="status"
          aria-label="Lädt Bestellung..."
        >
          {/* Header - Order number and status */}
          <div className="flex items-start justify-between mb-3">
            <SkeletonBase width="120px" height="24px" rounded="sm" />
            <SkeletonBase width="90px" height="28px" rounded="full" />
          </div>

          {/* Table info */}
          <div className="space-y-2 mb-4">
            <SkeletonBase width="100px" height="18px" rounded="sm" />
            <SkeletonBase width="140px" height="18px" rounded="sm" />
          </div>

          {/* Items list */}
          <div className="space-y-2 mb-4">
            <SkeletonBase width="100%" height="16px" rounded="sm" />
            <SkeletonBase width="90%" height="16px" rounded="sm" />
            <SkeletonBase width="85%" height="16px" rounded="sm" />
          </div>

          {/* Footer - Total amount */}
          <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
            <SkeletonBase width="60px" height="18px" rounded="sm" />
            <SkeletonBase width="80px" height="24px" rounded="sm" />
          </div>
        </div>
      ))}
    </>
  );
}
