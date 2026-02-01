"use client";

import { cn } from "@/lib/utils";
import { SkeletonBase } from "./skeleton-base";

interface SkeletonReservationCardProps {
  count?: number;
  className?: string;
}

export function SkeletonReservationCard({
  count = 1,
  className,
}: SkeletonReservationCardProps) {
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
          aria-label="Lädt Reservierung..."
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left side - Time and guest info */}
            <div className="flex-1 space-y-3">
              {/* Time */}
              <SkeletonBase width="120px" height="20px" rounded="sm" />

              {/* Guest name */}
              <SkeletonBase width="180px" height="24px" rounded="sm" />

              {/* Guest count */}
              <SkeletonBase width="80px" height="18px" rounded="sm" />
            </div>

            {/* Right side - Status badge */}
            <div className="flex flex-col items-end gap-2">
              <SkeletonBase width="100px" height="28px" rounded="full" />
              <SkeletonBase width="60px" height="18px" rounded="sm" />
            </div>
          </div>

          {/* Tags/Notes placeholder */}
          <div className="mt-3 flex gap-2">
            <SkeletonBase width="60px" height="24px" rounded="full" />
            <SkeletonBase width="80px" height="24px" rounded="full" />
          </div>
        </div>
      ))}
    </>
  );
}
