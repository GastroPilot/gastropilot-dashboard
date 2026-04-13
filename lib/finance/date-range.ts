import { endOfDay, format, startOfDay, subDays } from "date-fns";

export type FinanceRangePreset = "today" | "7d" | "30d" | "custom";

export interface FinanceRangeSelection {
  preset: FinanceRangePreset;
  customStartDate?: string;
  customEndDate?: string;
}

export interface ResolvedFinanceRange {
  from: Date;
  to: Date;
  fromDate: string;
  toDate: string;
  fromIso: string;
  toIso: string;
}

function parseIsoDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveFinanceRange(
  selection: FinanceRangeSelection,
  baseDate: Date = new Date()
): ResolvedFinanceRange {
  const reference = startOfDay(baseDate);
  let from = startOfDay(subDays(reference, 29));
  let to = endOfDay(reference);

  if (selection.preset === "today") {
    from = startOfDay(reference);
    to = endOfDay(reference);
  }

  if (selection.preset === "7d") {
    from = startOfDay(subDays(reference, 6));
    to = endOfDay(reference);
  }

  if (selection.preset === "30d") {
    from = startOfDay(subDays(reference, 29));
    to = endOfDay(reference);
  }

  if (selection.preset === "custom") {
    const parsedStart = parseIsoDate(selection.customStartDate);
    const parsedEnd = parseIsoDate(selection.customEndDate);

    from = parsedStart ? startOfDay(parsedStart) : from;
    to = parsedEnd ? endOfDay(parsedEnd) : to;
  }

  if (from > to) {
    const swappedFrom = startOfDay(to);
    const swappedTo = endOfDay(from);
    from = swappedFrom;
    to = swappedTo;
  }

  const fromDate = format(from, "yyyy-MM-dd");
  const toDate = format(to, "yyyy-MM-dd");

  return {
    from,
    to,
    fromDate,
    toDate,
    fromIso: `${fromDate}T00:00:00Z`,
    toIso: `${toDate}T23:59:59Z`,
  };
}
