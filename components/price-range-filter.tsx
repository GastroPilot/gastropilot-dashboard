"use client";

import { cn } from "@/lib/utils";

interface PriceRangeFilterProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function PriceRangeFilter({ value, onChange }: PriceRangeFilterProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4].map((level) => (
        <button
          key={level}
          onClick={() => onChange(value === level ? null : level)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            value === level
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {"€".repeat(level)}
        </button>
      ))}
    </div>
  );
}
