"use client";

import { cn } from "@/lib/utils";

interface SkeletonBaseProps {
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
  className?: string;
}

export function SkeletonBase({
  width = "100%",
  height = "1rem",
  rounded = "md",
  className,
}: SkeletonBaseProps) {
  const widthStyle = typeof width === "number" ? `${width}px` : width;
  const heightStyle = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn(
        "bg-muted animate-pulse",
        rounded === "sm" && "rounded-sm",
        rounded === "md" && "rounded-lg",
        rounded === "lg" && "rounded-xl",
        rounded === "full" && "rounded-full",
        className
      )}
      style={{ width: widthStyle, height: heightStyle }}
      role="status"
      aria-label="Lädt..."
    />
  );
}
