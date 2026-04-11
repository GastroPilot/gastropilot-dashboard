"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, endOfDay, format, parseISO, startOfDay, subDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  CreditCard,
  Euro,
  Percent,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinanceModuleLayout } from "@/components/finance/finance-module-layout";
import { FinanceRangeControls } from "@/components/finance/finance-range-controls";
import { type FinanceRangePreset, resolveFinanceRange } from "@/lib/finance/date-range";
import { useFinanceOverview } from "@/lib/hooks/queries/use-finance-overview";
import {
  orderStatisticsApi,
  type CategoryStatistics,
  type RevenueStatistics,
  type TopItem,
} from "@/lib/api/order-statistics";

const DASHBOARD_CARD_HOVER_CLASS =
  "transform-gpu shadow-md shadow-black/5 transition-all duration-200 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10";
const DASHBOARD_CARD_SURFACE_CLASS =
  "relative z-0 h-full border-border bg-card/70 hover:z-40 focus-within:z-40 hover:bg-card/80 hover:border-primary/30";
const DASHBOARD_ROW_HOVER_CLASS =
  "transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-accent/60";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatCategoryLabel(category: string | null | undefined): string {
  const normalizedCategory = (category ?? "").trim();
  if (!normalizedCategory || /^uncategorized$/i.test(normalizedCategory)) {
    return "Ohne Kategorie";
  }
  return normalizedCategory;
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

export default function FinanceRevenuePage() {
  const [preset, setPreset] = useState<FinanceRangePreset>("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [hoveredTimelineDate, setHoveredTimelineDate] = useState<string | null>(null);

  const resolvedRange = useMemo(
    () =>
      resolveFinanceRange({
        preset,
        customStartDate,
        customEndDate,
      }),
    [preset, customEndDate, customStartDate]
  );

  const previousRange = useMemo(
    () => buildPreviousRange(resolvedRange.from, resolvedRange.to),
    [resolvedRange.from, resolvedRange.to]
  );

  const { restaurant, orders, kpis, revenue, isLoading, isFetching, error, refetch } = useFinanceOverview({
    fromIso: resolvedRange.fromIso,
    toIso: resolvedRange.toIso,
  });

  const restaurantId = restaurant?.id ?? null;

  const previousRevenueQuery = useQuery({
    queryKey: ["finance", "revenue", "previous", restaurantId, previousRange.startIso, previousRange.endIso],
    enabled: Boolean(restaurantId),
    queryFn: async (): Promise<RevenueStatistics> =>
      orderStatisticsApi.getRevenue(restaurantId!, {
        start_date: previousRange.startIso,
        end_date: previousRange.endIso,
      }),
  });

  const topItemsQuery = useQuery({
    queryKey: ["finance", "top-items", restaurantId, resolvedRange.fromIso, resolvedRange.toIso],
    enabled: Boolean(restaurantId),
    queryFn: async (): Promise<TopItem[]> =>
      orderStatisticsApi.getTopItems(restaurantId!, {
        start_date: resolvedRange.fromIso,
        end_date: resolvedRange.toIso,
        limit: 8,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["finance", "categories", restaurantId, resolvedRange.fromIso, resolvedRange.toIso],
    enabled: Boolean(restaurantId),
    queryFn: async (): Promise<CategoryStatistics> =>
      orderStatisticsApi.getCategoryStatistics(restaurantId!, {
        start_date: resolvedRange.fromIso,
        end_date: resolvedRange.toIso,
      }),
  });

  const orderRevenueByDay = useMemo(() => {
    const result = new Map<string, number>();
    for (const order of orders) {
      if (!order.opened_at) continue;
      const parsed = parseISO(order.opened_at);
      if (Number.isNaN(parsed.getTime())) continue;
      const day = format(parsed, "yyyy-MM-dd");
      result.set(day, (result.get(day) ?? 0) + (Number(order.total) || 0));
    }
    return result;
  }, [orders]);

  const timelineResult = useMemo(() => {
    const dayCount = Math.max(1, differenceInCalendarDays(resolvedRange.to, resolvedRange.from) + 1);
    const days = Array.from({ length: dayCount }, (_, index) => format(addDays(resolvedRange.from, index), "yyyy-MM-dd"));
    const apiDailyRevenue = revenue?.daily_revenue ?? {};
    const apiTotal = Object.values(apiDailyRevenue).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const shouldPreferOrders = (Object.keys(apiDailyRevenue).length === 0 || apiTotal <= 0) && orderRevenueByDay.size > 0;

    const rows = days.map((day) => {
      const apiValue = Number(apiDailyRevenue[day]);
      const orderValue = Number(orderRevenueByDay.get(day) ?? 0);
      const amount = shouldPreferOrders
        ? orderValue
        : Math.max(Number.isFinite(apiValue) ? apiValue : 0, orderValue);

      return {
        date: day,
        amount,
        shortLabel: format(parseISO(`${day}T00:00:00`), "dd.MM", { locale: de }),
        tooltipLabel: format(parseISO(`${day}T00:00:00`), "dd.MM.yyyy", { locale: de }),
      };
    });

    return {
      rows,
      isFallback: shouldPreferOrders,
    };
  }, [orderRevenueByDay, resolvedRange.from, resolvedRange.to, revenue?.daily_revenue]);

  const revenueTimeline = timelineResult.rows;

  const timelineMetrics = useMemo(() => {
    const total = revenueTimeline.reduce((sum, entry) => sum + entry.amount, 0);
    const dayCount = Math.max(revenueTimeline.length, 1);
    const avg = total / dayCount;
    const peak = [...revenueTimeline].sort((a, b) => b.amount - a.amount)[0] ?? null;
    const weak = [...revenueTimeline].filter((entry) => entry.amount > 0).sort((a, b) => a.amount - b.amount)[0] ?? null;
    return { total, avg, peak, weak };
  }, [revenueTimeline]);

  const timelineAxisLabels = useMemo(() => {
    if (revenueTimeline.length === 0) return [] as string[];
    const first = revenueTimeline[0]?.shortLabel ?? "";
    const middle = revenueTimeline[Math.floor((revenueTimeline.length - 1) / 2)]?.shortLabel ?? "";
    const last = revenueTimeline[revenueTimeline.length - 1]?.shortLabel ?? "";
    return [first, middle, last];
  }, [revenueTimeline]);

  const timelinePoints = useMemo(() => {
    if (revenueTimeline.length === 0) return [] as Array<{ x: number; y: number }>;
    const maxValue = Math.max(...revenueTimeline.map((entry) => entry.amount), 1);
    const minValue = Math.min(...revenueTimeline.map((entry) => entry.amount), 0);
    const spread = Math.max(maxValue - minValue, 1);

    return revenueTimeline.map((entry, index) => {
      const x = revenueTimeline.length === 1 ? 50 : (index / (revenueTimeline.length - 1)) * 100;
      const normalized = (entry.amount - minValue) / spread;
      const y = 80 - normalized * 60;
      return { x, y };
    });
  }, [revenueTimeline]);

  const timelineAreaPath = useMemo(() => {
    if (timelinePoints.length === 0) return "";
    const pathPoints = timelinePoints.map((point) => `${point.x} ${point.y}`).join(" L ");
    return `M ${timelinePoints[0].x} 80 L ${pathPoints} L ${timelinePoints[timelinePoints.length - 1].x} 80 Z`;
  }, [timelinePoints]);

  const timelineLinePath = useMemo(() => buildSmoothCurvePath(timelinePoints), [timelinePoints]);

  const activeTimelineEntry = useMemo(() => {
    if (!hoveredTimelineDate) return null;
    return revenueTimeline.find((entry) => entry.date === hoveredTimelineDate) ?? null;
  }, [hoveredTimelineDate, revenueTimeline]);

  const categories = useMemo(() => {
    const entries = Object.entries(categoriesQuery.data ?? {});
    return entries
      .map(([name, stats]) => ({
        name,
        quantity: Number(stats.quantity ?? 0),
        revenue: Number(stats.revenue ?? 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [categoriesQuery.data]);

  const topItemsMaxRevenue = useMemo(() => {
    const topItems = topItemsQuery.data ?? [];
    if (topItems.length === 0) return 1;
    return Math.max(...topItems.map((item) => Number(item.revenue ?? 0)), 1);
  }, [topItemsQuery.data]);

  const maxCategoryRevenue = Math.max(...categories.map((entry) => entry.revenue), 1);
  const revenueChange = getChangePercent(kpis.totalRevenue, Number(previousRevenueQuery.data?.total_revenue ?? 0));
  const avgOrderChange = getChangePercent(
    kpis.avgOrderValue,
    Number(previousRevenueQuery.data?.average_order_value ?? 0)
  );
  const tipsRate = kpis.totalRevenue > 0 ? (kpis.totalTips / kpis.totalRevenue) * 100 : 0;
  const discountRate = kpis.totalRevenue > 0 ? (kpis.totalDiscounts / kpis.totalRevenue) * 100 : 0;
  const paymentTotal = kpis.cashRevenue + kpis.cardRevenue + kpis.otherRevenue;
  const paymentMix = [
    {
      label: "Karte",
      value: kpis.cardRevenue,
      pct: paymentTotal > 0 ? (kpis.cardRevenue / paymentTotal) * 100 : 0,
      tone: "bg-cyan-500",
    },
    {
      label: "Bar",
      value: kpis.cashRevenue,
      pct: paymentTotal > 0 ? (kpis.cashRevenue / paymentTotal) * 100 : 0,
      tone: "bg-emerald-500",
    },
    {
      label: "Sonstige",
      value: kpis.otherRevenue,
      pct: paymentTotal > 0 ? (kpis.otherRevenue / paymentTotal) * 100 : 0,
      tone: "bg-amber-500",
    },
  ];

  const analyticsError =
    (topItemsQuery.error as Error | null) ||
    (categoriesQuery.error as Error | null) ||
    (previousRevenueQuery.error as Error | null) ||
    null;

  const handleRefresh = async () => {
    await Promise.all([
      refetch(),
      previousRevenueQuery.refetch(),
      topItemsQuery.refetch(),
      categoriesQuery.refetch(),
    ]);
  };

  return (
    <FinanceModuleLayout
      title="Umsätze"
      description="Finanzkennzahlen und Umsatzanalysen mit Vorperiodenvergleich und operativen Treibern."
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardHeader>
            <CardTitle className="text-base">Zeitraum</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {error || analyticsError ? (
          <Card className="border-red-500/40 bg-red-500/10">
            <CardContent className="pt-5 text-sm text-red-200">
              Umsatzdaten konnten nicht vollständig geladen werden: {(error ?? analyticsError)?.message}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Gesamtumsatz</CardTitle>
                <Euro className="h-4 w-4 text-emerald-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">{kpis.totalOrders} Bestellungen</p>
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

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Durchschnittsbon</CardTitle>
                <Receipt className="h-4 w-4 text-indigo-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{formatCurrency(kpis.avgOrderValue)}</p>
              <p className="text-xs text-muted-foreground">
                Vorperiode: {formatCurrency(Number(previousRevenueQuery.data?.average_order_value ?? 0))}
              </p>
              <div className="flex items-center gap-1 text-xs">
                {avgOrderChange !== null && avgOrderChange >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span className={avgOrderChange !== null && avgOrderChange >= 0 ? "text-emerald-400" : "text-amber-400"}>
                  {formatSignedPercent(avgOrderChange)}
                </span>
                <span className="text-muted-foreground">vs. Vorperiode</span>
              </div>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Trinkgeld und Rabatte</CardTitle>
                <Percent className="h-4 w-4 text-cyan-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <p className="text-sm">
                Trinkgeld: <span className="font-semibold text-foreground">{formatCurrency(kpis.totalTips)}</span>
              </p>
              <p className="text-xs text-muted-foreground">Quote: {tipsRate.toFixed(1)}%</p>
              <p className="text-sm">
                Rabatte: <span className="font-semibold text-foreground">{formatCurrency(kpis.totalDiscounts)}</span>
              </p>
              <p className="text-xs text-muted-foreground">Quote: {discountRate.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Offene Beträge</CardTitle>
                <Wallet className="h-4 w-4 text-amber-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{formatCurrency(kpis.outstandingAmount)}</p>
              <p className="text-xs text-muted-foreground">{kpis.unpaidOrders} offene Bestellungen</p>
              <p className="text-xs text-muted-foreground">Fehlgeschlagene Zahlungen: {kpis.failedPayments}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className={`xl:col-span-2 ${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Umsatzverlauf</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Zeitraum: {format(resolvedRange.from, "dd.MM.yyyy", { locale: de })} - {" "}
                  {format(resolvedRange.to, "dd.MM.yyyy", { locale: de })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-md border border-border/70 bg-background/50 px-2 py-1">
                  Vorperiode: {previousRange.label}
                </span>
                <span className="rounded-md border border-border/70 bg-background/50 px-2 py-1">
                  Ø pro Tag: {formatCurrency(timelineMetrics.avg)}
                </span>
                {timelineResult.isFallback ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200">
                    <TrendingUp className="h-3 w-3" />
                    Verlauf aus Bestellwerten rekonstruiert
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {revenueTimeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Umsätze im gewählten Zeitraum.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className={`rounded-md border border-border/70 bg-background/40 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}>
                      <p className="text-muted-foreground">Stärkster Tag</p>
                      <p className="font-semibold text-foreground">
                        {timelineMetrics.peak ? `${timelineMetrics.peak.shortLabel} · ${formatCurrency(timelineMetrics.peak.amount)}` : "-"}
                      </p>
                    </div>
                    <div className={`rounded-md border border-border/70 bg-background/40 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}>
                      <p className="text-muted-foreground">Schwächster Umsatztag</p>
                      <p className="font-semibold text-foreground">
                        {timelineMetrics.weak ? `${timelineMetrics.weak.shortLabel} · ${formatCurrency(timelineMetrics.weak.amount)}` : "-"}
                      </p>
                    </div>
                    <div className={`rounded-md border border-border/70 bg-background/40 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}>
                      <p className="text-muted-foreground">Aktiver Hover</p>
                      <p className="font-semibold text-foreground">
                        {activeTimelineEntry
                          ? `${activeTimelineEntry.shortLabel} · ${formatCurrency(activeTimelineEntry.amount)}`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="relative h-64 rounded-xl border border-border/70 bg-background/40 p-3">
                    <svg viewBox="0 0 100 84" preserveAspectRatio="none" className="absolute inset-3 h-[calc(100%-2.5rem)] w-[calc(100%-1.5rem)]">
                      <defs>
                        <linearGradient id="finance-revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
                        </linearGradient>
                      </defs>

                      <line
                        x1="0"
                        y1="80"
                        x2="100"
                        y2="80"
                        stroke="currentColor"
                        className="text-border"
                        strokeWidth="1.2"
                        vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1="0"
                        y1="50"
                        x2="100"
                        y2="50"
                        stroke="currentColor"
                        className="text-border/60"
                        strokeDasharray="2 3"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                      <line
                        x1="0"
                        y1="20"
                        x2="100"
                        y2="20"
                        stroke="currentColor"
                        className="text-border/60"
                        strokeDasharray="2 3"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />

                      <path d={timelineAreaPath} fill="url(#finance-revenue-gradient)" className="text-primary" />
                      <path
                        d={timelineLinePath}
                        fill="none"
                        stroke="currentColor"
                        className="text-primary"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />

                    </svg>

                    <div
                      className="absolute inset-x-3 top-3 bottom-8 grid gap-x-0"
                      style={{ gridTemplateColumns: `repeat(${Math.max(revenueTimeline.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {revenueTimeline.map((entry) => (
                        <button
                          key={entry.date}
                          type="button"
                          className={`h-full w-full border-r border-border/40 last:border-r-0 transition-colors ${
                            hoveredTimelineDate === entry.date ? "bg-primary/10" : "hover:bg-accent/40"
                          }`}
                          onMouseEnter={() => setHoveredTimelineDate(entry.date)}
                          onMouseLeave={() => setHoveredTimelineDate(null)}
                          onFocus={() => setHoveredTimelineDate(entry.date)}
                          onBlur={() => setHoveredTimelineDate(null)}
                          title={`${entry.tooltipLabel}: ${formatCurrency(entry.amount)}`}
                        />
                      ))}
                    </div>

                    <div className="absolute inset-x-3 bottom-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      {timelineAxisLabels.map((label, index) => (
                        <span key={`${label}-${index}`}>{label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Zahlungsmix</CardTitle>
                <CreditCard className="h-4 w-4 text-cyan-300" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentMix.map((entry) => (
                <div
                  key={entry.label}
                  className={`space-y-1.5 rounded-md border border-border/70 bg-background/30 p-2.5 ${DASHBOARD_ROW_HOVER_CLASS}`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{entry.label}</span>
                    <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
                  </div>
                  <div className="h-2.5 rounded bg-muted overflow-hidden">
                    <div className={`h-full ${entry.tone}`} style={{ width: `${Math.max(2, entry.pct)}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{entry.pct.toFixed(1)}%</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base">Top-Artikel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(topItemsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Artikeldaten im Zeitraum.</p>
              ) : (
                <div className="space-y-2">
                  {(topItemsQuery.data ?? []).map((item, index) => (
                    <div
                      key={`${item.item_name}-${index}`}
                      className={`relative overflow-hidden flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-0 bg-primary/10"
                        style={{ width: `${Math.max(0, Math.min(100, (Number(item.revenue ?? 0) / topItemsMaxRevenue) * 100))}%` }}
                      />
                      <div className="relative z-10 min-w-0">
                        <p className="font-medium text-foreground truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity_sold}x verkauft</p>
                      </div>
                      <p className="relative z-10 font-semibold text-foreground">{formatCurrency(item.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base">Kategorien</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Kategoriedaten im Zeitraum.</p>
              ) : (
                <div className="space-y-3">
                  {categories.map((entry) => (
                    <div
                      key={entry.name}
                      className={`space-y-1.5 rounded-md border border-border/70 bg-background/30 p-2.5 ${DASHBOARD_ROW_HOVER_CLASS}`}
                    >
                      <div className="flex items-center justify-between text-sm gap-2">
                        <span className="text-foreground truncate">{formatCategoryLabel(entry.name)}</span>
                        <span className="font-medium text-foreground">{formatCurrency(entry.revenue)}</span>
                      </div>
                      <div className="h-2.5 rounded bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary/80"
                          style={{ width: `${Math.max(2, (entry.revenue / maxCategoryRevenue) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{entry.quantity} Positionen</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </FinanceModuleLayout>
  );
}
