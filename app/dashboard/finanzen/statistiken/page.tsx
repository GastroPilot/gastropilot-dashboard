"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, endOfDay, format, parseISO, startOfDay, subDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  BarChart3,
  CalendarDays,
  Package,
  RefreshCw,
  ShoppingBasket,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinanceModuleLayout } from "@/components/finance/finance-module-layout";
import { FinanceRangeControls } from "@/components/finance/finance-range-controls";
import { type FinanceRangePreset, resolveFinanceRange } from "@/lib/finance/date-range";
import { restaurantsApi } from "@/lib/api/restaurants";
import { ordersApi } from "@/lib/api/orders";
import {
  orderStatisticsApi,
  type CategoryStatistics,
  type HourlyStatistics,
  type RevenueStatistics,
  type TopItem,
} from "@/lib/api/order-statistics";

const DASHBOARD_CARD_HOVER_CLASS =
  "transform-gpu shadow-md shadow-black/5 transition-all duration-200 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10";

const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getChangePercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function buildPreviousRange(from: Date, to: Date): { startIso: string; endIso: string; label: string } {
  const dayCount = Math.max(1, differenceInCalendarDays(to, from) + 1);
  const prevTo = endOfDay(subDays(startOfDay(from), 1));
  const prevFrom = startOfDay(subDays(prevTo, dayCount - 1));
  return {
    startIso: `${format(prevFrom, "yyyy-MM-dd")}T00:00:00Z`,
    endIso: `${format(prevTo, "yyyy-MM-dd")}T23:59:59Z`,
    label: `${format(prevFrom, "dd.MM.yyyy", { locale: de })} - ${format(prevTo, "dd.MM.yyyy", { locale: de })}`,
  };
}

function buildSmoothCurvePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = index === 0 ? points[index] : points[index - 1];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = index + 2 < points.length ? points[index + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const rawCp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const rawCp2y = p2.y - (p3.y - p1.y) / 6;
    const segmentMinY = Math.min(p1.y, p2.y);
    const segmentMaxY = Math.max(p1.y, p2.y);
    const cp1y = Math.min(segmentMaxY, Math.max(segmentMinY, rawCp1y));
    const cp2y = Math.min(segmentMaxY, Math.max(segmentMinY, rawCp2y));

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

export default function FinancePeriodStatsPage() {
  const [preset, setPreset] = useState<FinanceRangePreset>("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [hoveredTrendDate, setHoveredTrendDate] = useState<string | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const resolvedRange = useMemo(
    () =>
      resolveFinanceRange({
        preset,
        customStartDate,
        customEndDate,
      }),
    [preset, customStartDate, customEndDate]
  );

  const previousRange = useMemo(
    () => buildPreviousRange(resolvedRange.from, resolvedRange.to),
    [resolvedRange.from, resolvedRange.to]
  );

  const restaurantQuery = useQuery({
    queryKey: ["finance", "stats", "restaurant"],
    queryFn: async () => {
      const restaurants = await restaurantsApi.list();
      return restaurants[0] ?? null;
    },
    staleTime: 60 * 1000,
  });

  const restaurantId = restaurantQuery.data?.id ?? null;

  const currentRevenueQuery = useQuery({
    queryKey: ["finance", "stats", "revenue", restaurantId, resolvedRange.fromIso, resolvedRange.toIso],
    enabled: Boolean(restaurantId),
    queryFn: async (): Promise<RevenueStatistics> =>
      orderStatisticsApi.getRevenue(restaurantId!, {
        start_date: resolvedRange.fromIso,
        end_date: resolvedRange.toIso,
      }),
  });

  const previousRevenueQuery = useQuery({
    queryKey: ["finance", "stats", "revenue", "previous", restaurantId, previousRange.startIso, previousRange.endIso],
    enabled: Boolean(restaurantId),
    queryFn: async (): Promise<RevenueStatistics> =>
      orderStatisticsApi.getRevenue(restaurantId!, {
        start_date: previousRange.startIso,
        end_date: previousRange.endIso,
      }),
  });

  const ordersQuery = useQuery({
    queryKey: ["finance", "stats", "orders", restaurantId, resolvedRange.fromIso, resolvedRange.toIso],
    enabled: Boolean(restaurantId),
    queryFn: async () =>
      ordersApi.list(restaurantId!, {
        start_date: resolvedRange.fromIso,
        end_date: resolvedRange.toIso,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["finance", "stats", "categories", restaurantId, resolvedRange.fromIso, resolvedRange.toIso],
    enabled: Boolean(restaurantId),
    queryFn: async (): Promise<CategoryStatistics> =>
      orderStatisticsApi.getCategoryStatistics(restaurantId!, {
        start_date: resolvedRange.fromIso,
        end_date: resolvedRange.toIso,
      }),
  });

  const topItemsQuery = useQuery({
    queryKey: ["finance", "stats", "top-items", restaurantId, resolvedRange.fromIso, resolvedRange.toIso],
    enabled: Boolean(restaurantId),
    queryFn: async (): Promise<TopItem[]> =>
      orderStatisticsApi.getTopItems(restaurantId!, {
        start_date: resolvedRange.fromIso,
        end_date: resolvedRange.toIso,
        limit: 6,
      }),
  });

  const hourlyQuery = useQuery({
    queryKey: ["finance", "stats", "hourly", restaurantId, resolvedRange.fromIso, resolvedRange.toIso],
    enabled: Boolean(restaurantId),
    queryFn: async (): Promise<HourlyStatistics> =>
      orderStatisticsApi.getHourlyStatistics(restaurantId!, {
        start_date: resolvedRange.fromIso,
        end_date: resolvedRange.toIso,
      }),
  });

  const isLoading =
    restaurantQuery.isLoading ||
    currentRevenueQuery.isLoading ||
    previousRevenueQuery.isLoading ||
    ordersQuery.isLoading ||
    categoriesQuery.isLoading ||
    topItemsQuery.isLoading ||
    hourlyQuery.isLoading;

  const isFetching =
    restaurantQuery.isFetching ||
    currentRevenueQuery.isFetching ||
    previousRevenueQuery.isFetching ||
    ordersQuery.isFetching ||
    categoriesQuery.isFetching ||
    topItemsQuery.isFetching ||
    hourlyQuery.isFetching;

  const currentRevenue = currentRevenueQuery.data;
  const previousRevenue = previousRevenueQuery.data;

  const orderRevenueByDay = useMemo(() => {
    const result = new Map<string, number>();
    for (const order of ordersQuery.data ?? []) {
      if (!order.opened_at) continue;
      const parsed = parseISO(order.opened_at);
      if (Number.isNaN(parsed.getTime())) continue;
      const day = format(parsed, "yyyy-MM-dd");
      result.set(day, (result.get(day) ?? 0) + (Number(order.total) || 0));
    }
    return result;
  }, [ordersQuery.data]);

  const trendResult = useMemo(() => {
    const dayCount = Math.max(1, differenceInCalendarDays(resolvedRange.to, resolvedRange.from) + 1);
    const days = Array.from({ length: dayCount }, (_, index) => format(addDays(resolvedRange.from, index), "yyyy-MM-dd"));
    const apiDaily = currentRevenue?.daily_revenue ?? {};
    const apiTotal = Object.values(apiDaily).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const shouldPreferOrders = (Object.keys(apiDaily).length === 0 || apiTotal <= 0) && orderRevenueByDay.size > 0;

    const rows = days.map((date) => {
      const apiValue = Number(apiDaily[date]);
      const orderValue = Number(orderRevenueByDay.get(date) ?? 0);
      const revenue = shouldPreferOrders
        ? orderValue
        : Math.max(Number.isFinite(apiValue) ? apiValue : 0, orderValue);

      return {
        date,
        revenue,
        shortLabel: format(parseISO(`${date}T00:00:00`), "dd.MM", { locale: de }),
        tooltipLabel: format(parseISO(`${date}T00:00:00`), "dd.MM.yyyy", { locale: de }),
      };
    });

    return {
      rows,
      isFallback: shouldPreferOrders,
    };
  }, [currentRevenue?.daily_revenue, orderRevenueByDay, resolvedRange.from, resolvedRange.to]);

  const trendRows = trendResult.rows;

  const trendAxisLabels = useMemo(() => {
    if (trendRows.length === 0) return [] as string[];
    const first = trendRows[0]?.shortLabel ?? "";
    const middle = trendRows[Math.floor((trendRows.length - 1) / 2)]?.shortLabel ?? "";
    const last = trendRows[trendRows.length - 1]?.shortLabel ?? "";
    return [first, middle, last];
  }, [trendRows]);

  const trendPoints = useMemo(() => {
    if (trendRows.length === 0) return [] as Array<{ x: number; y: number }>;
    const maxRevenue = Math.max(...trendRows.map((entry) => entry.revenue), 1);
    const minRevenue = Math.min(...trendRows.map((entry) => entry.revenue), 0);
    const spread = Math.max(maxRevenue - minRevenue, 1);

    return trendRows.map((entry, index) => {
      const x = trendRows.length === 1 ? 50 : (index / (trendRows.length - 1)) * 100;
      const normalized = (entry.revenue - minRevenue) / spread;
      const y = 80 - normalized * 60;
      return { x, y };
    });
  }, [trendRows]);

  const trendAreaPath = useMemo(() => {
    if (trendPoints.length === 0) return "";
    const pathPoints = trendPoints.map((point) => `${point.x} ${point.y}`).join(" L ");
    return `M ${trendPoints[0].x} 80 L ${pathPoints} L ${trendPoints[trendPoints.length - 1].x} 80 Z`;
  }, [trendPoints]);

  const trendLinePath = useMemo(() => buildSmoothCurvePath(trendPoints), [trendPoints]);

  const activeTrendEntry = useMemo(() => {
    if (hoveredTrendDate) {
      const hovered = trendRows.find((entry) => entry.date === hoveredTrendDate);
      if (hovered) return hovered;
    }
    return [...trendRows].sort((a, b) => b.revenue - a.revenue)[0] ?? null;
  }, [hoveredTrendDate, trendRows]);

  const activeTrendPoint = useMemo(() => {
    if (!activeTrendEntry) return null;
    const index = trendRows.findIndex((entry) => entry.date === activeTrendEntry.date);
    if (index < 0) return null;
    return trendPoints[index] ?? null;
  }, [activeTrendEntry, trendPoints, trendRows]);

  const maxTrendRevenue = Math.max(...trendRows.map((entry) => entry.revenue), 1);

  const categories = useMemo(() => {
    const entries = Object.entries(categoriesQuery.data ?? {});
    return entries
      .map(([name, stats]) => ({
        name,
        revenue: Number(stats.revenue) || 0,
        quantity: Number(stats.quantity) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [categoriesQuery.data]);

  const maxCategoryRevenue = Math.max(...categories.map((entry) => entry.revenue), 1);

  const weekdayDistribution = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, day) => ({
      day,
      label: WEEKDAY_LABELS[day],
      revenue: 0,
      count: 0,
    }));

    for (const entry of trendRows) {
      const day = parseISO(`${entry.date}T00:00:00`).getDay();
      buckets[day].revenue += entry.revenue;
      buckets[day].count += 1;
    }

    return buckets;
  }, [trendRows]);

  const maxWeekdayRevenue = Math.max(...weekdayDistribution.map((entry) => entry.revenue), 1);

  const hourlyRows = useMemo(() => {
    const source = hourlyQuery.data ?? {};
    const rows = Array.from({ length: 24 }, (_, hour) => {
      const stats = source[String(hour)] ?? { order_count: 0, revenue: 0 };
      return {
        hour,
        revenue: Number(stats.revenue) || 0,
        count: Number(stats.order_count) || 0,
      };
    });

    const max = Math.max(...rows.map((row) => row.revenue), 1);
    return rows.map((row) => ({ ...row, barHeight: (row.revenue / max) * 100 }));
  }, [hourlyQuery.data]);

  const peakHour = useMemo(() => {
    if (hourlyRows.length === 0) return null;
    return [...hourlyRows].sort((a, b) => b.revenue - a.revenue)[0];
  }, [hourlyRows]);

  const activeHourData = useMemo(() => {
    if (hoveredHour !== null) {
      return hourlyRows.find((entry) => entry.hour === hoveredHour) ?? null;
    }
    return peakHour;
  }, [hourlyRows, hoveredHour, peakHour]);

  const revenueChange = getChangePercent(
    Number(currentRevenue?.total_revenue ?? 0),
    Number(previousRevenue?.total_revenue ?? 0)
  );
  const ordersChange = getChangePercent(
    Number(currentRevenue?.total_orders ?? 0),
    Number(previousRevenue?.total_orders ?? 0)
  );
  const avgChange = getChangePercent(
    Number(currentRevenue?.average_order_value ?? 0),
    Number(previousRevenue?.average_order_value ?? 0)
  );

  const statsError =
    (restaurantQuery.error as Error | null) ||
    (currentRevenueQuery.error as Error | null) ||
    (previousRevenueQuery.error as Error | null) ||
    (ordersQuery.error as Error | null) ||
    (categoriesQuery.error as Error | null) ||
    (topItemsQuery.error as Error | null) ||
    (hourlyQuery.error as Error | null) ||
    null;

  const refreshAll = async () => {
    await Promise.all([
      restaurantQuery.refetch(),
      currentRevenueQuery.refetch(),
      previousRevenueQuery.refetch(),
      ordersQuery.refetch(),
      categoriesQuery.refetch(),
      topItemsQuery.refetch(),
      hourlyQuery.refetch(),
    ]);
  };

  return (
    <FinanceModuleLayout
      title="Wochen- und Monatstatistiken"
      description="Finanzentwicklung nach Zeitraum mit Vorperiodenvergleich und statistischen Treibern."
      actions={
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardHeader>
            <CardTitle className="text-base">Zeitraum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="inline-flex rounded-md border border-border bg-background/40 p-1">
              <button
                type="button"
                className={`rounded px-3 py-1.5 text-xs ${
                  preset === "7d" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setPreset("7d");
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
              >
                Woche
              </button>
              <button
                type="button"
                className={`rounded px-3 py-1.5 text-xs ${
                  preset === "30d" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setPreset("30d");
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
              >
                Monat
              </button>
            </div>

            <FinanceRangeControls
              preset={preset}
              startDate={resolvedRange.fromDate}
              endDate={resolvedRange.toDate}
              disabled={isLoading}
              onPresetChange={(nextPreset) => {
                setPreset(nextPreset);
                if (nextPreset !== "custom") {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }
              }}
              onStartDateChange={(date) => {
                setPreset("custom");
                setCustomStartDate(date);
              }}
              onEndDateChange={(date) => {
                setPreset("custom");
                setCustomEndDate(date);
              }}
            />

            <p className="text-xs text-muted-foreground">Vorperiode: {previousRange.label}</p>
          </CardContent>
        </Card>

        {statsError ? (
          <Card className="border-red-500/40 bg-red-500/10 shadow-lg shadow-red-950/20">
            <CardContent className="pt-4 text-sm text-red-200">{statsError.message}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Umsatz</CardTitle>
                <BarChart3 className="h-4 w-4 text-emerald-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{formatCurrency(Number(currentRevenue?.total_revenue ?? 0))}</p>
              <div className="flex items-center gap-1 text-xs">
                {revenueChange !== null && revenueChange >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span className={revenueChange !== null && revenueChange >= 0 ? "text-emerald-400" : "text-amber-400"}>
                  {formatSignedPercent(revenueChange)}
                </span>
                <span className="text-muted-foreground">vs. Vorperiode</span>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Bestellungen</CardTitle>
                <ShoppingBasket className="h-4 w-4 text-indigo-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{Number(currentRevenue?.total_orders ?? 0)}</p>
              <p className="text-xs text-muted-foreground">
                Veränderung: <span className="text-foreground">{formatSignedPercent(ordersChange)}</span>
              </p>
            </CardContent>
          </Card>

          <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Durchschnittsbon</CardTitle>
                <Package className="h-4 w-4 text-cyan-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{formatCurrency(Number(currentRevenue?.average_order_value ?? 0))}</p>
              <p className="text-xs text-muted-foreground">
                Veränderung: <span className="text-foreground">{formatSignedPercent(avgChange)}</span>
              </p>
            </CardContent>
          </Card>

          <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Peak-Stunde</CardTitle>
                <CalendarDays className="h-4 w-4 text-amber-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{peakHour ? `${String(peakHour.hour).padStart(2, "0")}:00` : "-"}</p>
              <p className="text-xs text-muted-foreground">{peakHour ? formatCurrency(peakHour.revenue) : "Keine Daten"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className={`xl:col-span-2 border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Tagestrend</CardTitle>
                <span className="text-xs text-muted-foreground">Max: {formatCurrency(maxTrendRevenue)}</span>
              </div>
              {trendResult.isFallback ? (
                <p className="text-xs text-amber-200">Trend aus Bestellwerten rekonstruiert (API-Tageswerte unvollständig).</p>
              ) : null}
            </CardHeader>
            <CardContent>
              {trendRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Tagesdaten im gewählten Zeitraum.</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                    <svg viewBox="0 0 100 84" preserveAspectRatio="none" className="h-56 w-full">
                      <defs>
                        <linearGradient id="finance-period-trend-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
                        </linearGradient>
                      </defs>

                      <line x1="0" y1="80" x2="100" y2="80" stroke="currentColor" className="text-border" strokeWidth="1.2" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" className="text-border/60" strokeDasharray="2 3" strokeWidth="1" />
                      <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" className="text-border/60" strokeDasharray="2 3" strokeWidth="1" />

                      <path d={trendAreaPath} fill="url(#finance-period-trend-gradient)" className="text-primary" />
                      <path d={trendLinePath} fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.4" />

                      {activeTrendPoint ? (
                        <circle cx={activeTrendPoint.x} cy={activeTrendPoint.y} r="1.8" className="fill-primary" />
                      ) : null}
                    </svg>

                    <div
                      className="-mt-56 h-56 grid gap-x-0"
                      style={{ gridTemplateColumns: `repeat(${Math.max(trendRows.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {trendRows.map((entry) => (
                        <button
                          key={entry.date}
                          type="button"
                          className={`h-full rounded-sm transition-colors ${
                            hoveredTrendDate === entry.date ? "bg-primary/10" : "hover:bg-accent/40"
                          }`}
                          onMouseEnter={() => setHoveredTrendDate(entry.date)}
                          onMouseLeave={() => setHoveredTrendDate(null)}
                          onFocus={() => setHoveredTrendDate(entry.date)}
                          onBlur={() => setHoveredTrendDate(null)}
                          title={`${entry.tooltipLabel}: ${formatCurrency(entry.revenue)}`}
                        />
                      ))}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      {trendAxisLabels.map((label, index) => (
                        <span key={`${label}-${index}`}>{label}</span>
                      ))}
                    </div>
                  </div>

                  {activeTrendEntry ? (
                    <p className="text-xs text-muted-foreground">
                      Aktiver Tag: <span className="text-foreground font-medium">{activeTrendEntry.shortLabel}</span> · {formatCurrency(activeTrendEntry.revenue)}
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base">Wochentagsprofil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weekdayDistribution.map((entry) => (
                <div key={entry.day} className="space-y-1.5 rounded-md border border-border/70 bg-background/30 p-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{entry.label}</span>
                    <span className="font-medium text-foreground">{formatCurrency(entry.revenue)}</span>
                  </div>
                  <div className="h-2.5 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/80"
                      style={{ width: `${Math.max(2, (entry.revenue / maxWeekdayRevenue) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{entry.count} Tage im Zeitraum</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base">Top-Kategorien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Kategoriedaten verfügbar.</p>
              ) : (
                categories.map((entry) => (
                  <div key={entry.name} className="space-y-1.5 rounded-md border border-border/70 bg-background/30 p-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{entry.name}</span>
                      <span className="font-medium text-foreground">{formatCurrency(entry.revenue)}</span>
                    </div>
                    <div className="h-2.5 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(2, (entry.revenue / maxCategoryRevenue) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{entry.quantity} Positionen</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base">Top-Artikel</CardTitle>
            </CardHeader>
            <CardContent>
              {(topItemsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Artikeldaten verfügbar.</p>
              ) : (
                <div className="space-y-2">
                  {(topItemsQuery.data ?? []).map((item, idx) => (
                    <div
                      key={`${item.item_name}-${idx}`}
                      className="rounded border border-border/60 bg-background/40 px-3 py-2 transition-colors hover:bg-accent/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{item.item_name}</span>
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(item.revenue)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.quantity_sold}x verkauft</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Stundenprofil (Umsatz)</CardTitle>
              <span className="text-xs text-muted-foreground">
                {activeHourData
                  ? `${String(activeHourData.hour).padStart(2, "0")}:00 · ${formatCurrency(activeHourData.revenue)}`
                  : "Keine Daten"}
              </span>
            </div>
            {activeHourData ? (
              <p className="text-xs text-muted-foreground">{activeHourData.count} Bestellungen in der ausgewählten Stunde</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-2">
              {hourlyRows.map((entry) => (
                <button
                  key={entry.hour}
                  type="button"
                  className="flex flex-col items-center gap-1"
                  onMouseEnter={() => setHoveredHour(entry.hour)}
                  onMouseLeave={() => setHoveredHour(null)}
                  onFocus={() => setHoveredHour(entry.hour)}
                  onBlur={() => setHoveredHour(null)}
                  title={`${String(entry.hour).padStart(2, "0")}:00 - ${formatCurrency(entry.revenue)} (${entry.count} Bestellungen)`}
                >
                  <div
                    className={`h-24 w-full rounded border border-border/70 bg-background/40 overflow-hidden relative transition-colors ${
                      hoveredHour === entry.hour ? "bg-accent/40" : ""
                    }`}
                  >
                    {entry.revenue > 0 ? (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary/80"
                        style={{ height: `${Math.max(4, entry.barHeight)}%` }}
                      />
                    ) : null}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{String(entry.hour).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceModuleLayout>
  );
}
