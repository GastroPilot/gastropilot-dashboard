"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FinanceRangePreset } from "@/lib/finance/date-range";

interface FinanceRangeControlsProps {
  preset: FinanceRangePreset;
  startDate: string;
  endDate: string;
  disabled?: boolean;
  onPresetChange: (preset: FinanceRangePreset) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const PRESETS: Array<{ id: FinanceRangePreset; label: string }> = [
  { id: "today", label: "Heute" },
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "custom", label: "Benutzerdefiniert" },
];

export function FinanceRangeControls({
  preset,
  startDate,
  endDate,
  disabled,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
}: FinanceRangeControlsProps) {
  return (
    <div className="space-y-3">
      <div className="inline-flex items-center rounded-lg border border-border bg-background p-1 gap-1">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onPresetChange(item.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              item.id === preset
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
              disabled ? "opacity-60 cursor-not-allowed" : ""
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          type="date"
          value={startDate}
          disabled={disabled}
          onChange={(event) => onStartDateChange(event.target.value)}
          className="w-full sm:w-44"
        />
        <span className="text-xs text-muted-foreground">bis</span>
        <Input
          type="date"
          value={endDate}
          disabled={disabled}
          onChange={(event) => onEndDateChange(event.target.value)}
          className="w-full sm:w-44"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onPresetChange("custom")}
          className="sm:ml-2"
        >
          Zeitraum fixieren
        </Button>
      </div>
    </div>
  );
}
