"use client";

import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type OpeningHoursMap = Record<string, { open: string; close: string }>;

interface OpeningHoursProps {
  openingHours: OpeningHoursMap | null;
  compact?: boolean;
}

const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};

function getCurrentWeekday(): string {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[new Date().getDay()];
}

export function isOpenNow(hours: OpeningHoursMap | null): boolean {
  if (!hours) return false;
  const today = getCurrentWeekday();
  const todayHours = hours[today];
  if (!todayHours) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = todayHours.open.split(":").map(Number);
  const [closeH, closeM] = todayHours.close.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

export function OpeningHours({ openingHours, compact }: OpeningHoursProps) {
  if (!openingHours) return null;

  if (compact) {
    const open = isOpenNow(openingHours);
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 text-xs",
          open
            ? "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
            : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
        )}
      >
        <Clock className="h-3 w-3" />
        {open ? "Jetzt geöffnet" : "Geschlossen"}
      </Badge>
    );
  }

  const today = getCurrentWeekday();

  return (
    <div className="space-y-1">
      {WEEKDAY_ORDER.map((day) => {
        const hours = openingHours[day];
        const isToday = day === today;
        return (
          <div
            key={day}
            className={cn(
              "flex justify-between text-sm",
              isToday && "font-semibold text-primary"
            )}
          >
            <span>{WEEKDAY_LABELS[day]}</span>
            <span className={cn(!isToday && "text-muted-foreground")}>
              {hours ? `${hours.open} - ${hours.close}` : "Geschlossen"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
