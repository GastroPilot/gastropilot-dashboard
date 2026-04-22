"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, endOfDay, format, parseISO, startOfDay, subDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Euro,
  LineChart,
  Package,
  Percent,
  Receipt,
  RefreshCw,
  Tag,
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
  "relative z-0 border-border bg-card/70 hover:z-40 focus-within:z-40 hover:bg-card/80 hover:border-primary/30";
const DASHBOARD_ROW_HOVER_CLASS =
  "transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-accent/60";
const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatCurrencyAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const compact = new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: abs >= 10_000_000 ? 0 : 1,
    }).format(value / 1_000_000);
    return `${compact}M€`;
  }
  if (abs >= 1000) {
    const compact = new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: abs >= 10000 ? 0 : 1,
    }).format(value / 1000);
    return `${compact}k€`;
  }
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(value)}€`;
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
  const [appliedPreset, setAppliedPreset] = useState<FinanceRangePreset>("30d");
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState("");
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState("");
  const [draftPreset, setDraftPreset] = useState<FinanceRangePreset>("30d");
  const [draftCustomStartDate, setDraftCustomStartDate] = useState("");
  const [draftCustomEndDate, setDraftCustomEndDate] = useState("");
  const [hoveredTimelineDate, setHoveredTimelineDate] = useState<string | null>(null);
  const [hoveredWeekday, setHoveredWeekday] = useState<number | null>(null);

  const draftResolvedRange = useMemo(
    () =>
      resolveFinanceRange({
        preset: draftPreset,
        customStartDate: draftCustomStartDate,
        customEndDate: draftCustomEndDate,
      }),
    [draftCustomEndDate, draftCustomStartDate, draftPreset]
  );

  const resolvedRange = useMemo(
    () =>
      resolveFinanceRange({
        preset: appliedPreset,
        customStartDate: appliedCustomStartDate,
        customEndDate: appliedCustomEndDate,
      }),
    [appliedCustomEndDate, appliedCustomStartDate, appliedPreset]
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
  const revenueMax = useMemo(() => {
    if (revenueTimeline.length === 0) return 0;
    return Math.max(...revenueTimeline.map((entry) => entry.amount), 0);
  }, [revenueTimeline]);
  const revenueYAxisTicks = useMemo(() => [revenueMax, revenueMax / 2, 0], [revenueMax]);

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

  const weekdayDistribution = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, day) => ({
      day,
      label: WEEKDAY_LABELS[day],
      revenue: 0,
      count: 0,
    }));

    for (const entry of revenueTimeline) {
      const day = parseISO(`${entry.date}T00:00:00`).getDay();
      buckets[day].revenue += entry.amount;
      buckets[day].count += 1;
    }

    return buckets;
  }, [revenueTimeline]);

  const maxWeekdayRevenue = Math.max(...weekdayDistribution.map((entry) => entry.revenue), 1);
  const strongestWeekday = useMemo(
    () => [...weekdayDistribution].sort((a, b) => b.revenue - a.revenue).find((entry) => entry.revenue > 0) ?? null,
    [weekdayDistribution]
  );
  const hasWeekdayRevenue = weekdayDistribution.some((entry) => entry.revenue > 0);
  const activeWeekday = useMemo(() => {
    if (hoveredWeekday !== null) {
      return weekdayDistribution.find((entry) => entry.day === hoveredWeekday) ?? null;
    }
    return strongestWeekday;
  }, [hoveredWeekday, weekdayDistribution, strongestWeekday]);

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

  const hasPendingRangeChanges =
    draftPreset !== appliedPreset ||
    draftCustomStartDate !== appliedCustomStartDate ||
    draftCustomEndDate !== appliedCustomEndDate;

  const handleRefresh = async () => {
    if (hasPendingRangeChanges) {
      setAppliedPreset(draftPreset);
      setAppliedCustomStartDate(draftCustomStartDate);
      setAppliedCustomEndDate(draftCustomEndDate);
      return;
    }

    await Promise.all([
      refetch(),
      previousRevenueQuery.refetch(),
      topItemsQuery.refetch(),
      categoriesQuery.refetch(),
    ]);
  };

  return (
    <FinanceModuleLayout
      title="Umsatz & Statistiken"
      description="Zentrale Finanzanalyse mit Kennzahlen, Umsatzverlauf, Kategorien und Top-Artikeln."
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
          {hasPendingRangeChanges ? "Anwenden" : "Aktualisieren"}
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary-contrast" />
              Zeitraum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceRangeControls
              preset={draftPreset}
              startDate={draftResolvedRange.fromDate}
              endDate={draftResolvedRange.toDate}
              disabled={isLoading}
              onPresetChange={(nextPreset) => {
                setDraftPreset(nextPreset);
                if (nextPreset !== "custom") {
                  setDraftCustomStartDate("");
                  setDraftCustomEndDate("");
                }
              }}
              onStartDateChange={(date) => {
                setDraftPreset("custom");
                setDraftCustomStartDate(date);
              }}
              onEndDateChange={(date) => {
                setDraftPreset("custom");
                setDraftCustomEndDate(date);
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Euro className="h-4 w-4 text-emerald-300" />
                Gesamtumsatz
              </CardTitle>
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-300" />
                Durchschnittsbon
              </CardTitle>
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-cyan-300" />
                Trinkgeld und Rabatte
              </CardTitle>
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-300" />
                Offene Beträge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{formatCurrency(kpis.outstandingAmount)}</p>
              <p className="text-xs text-muted-foreground">{kpis.unpaidOrders} offene Bestellungen</p>
              <p className="text-xs text-muted-foreground">Fehlgeschlagene Zahlungen: {kpis.failedPayments}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          <Card className={`xl:col-span-2 ${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-primary-contrast" />
                  Umsatzverlauf
                </CardTitle>
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

                  <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                    <div className="grid h-44 grid-cols-[44px_minmax(0,1fr)] gap-1">
                      <div className="pointer-events-none flex h-full flex-col justify-between py-1 text-right text-[9px] text-muted-foreground tabular-nums">
                        <span className="whitespace-nowrap">{formatCurrencyAxis(revenueYAxisTicks[0])}</span>
                        <span className="whitespace-nowrap">{formatCurrencyAxis(revenueYAxisTicks[1])}</span>
                        <span className="whitespace-nowrap">{formatCurrencyAxis(revenueYAxisTicks[2])}</span>
                      </div>

                      <div className="relative h-full">
                        <svg viewBox="0 0 100 84" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                          <defs>
                            <linearGradient id="finance-revenue-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
                              <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
                            </linearGradient>
                          </defs>

                          <line
                            x1="0"
                            y1="20"
                            x2="0"
                            y2="80"
                            stroke="currentColor"
                            className="text-border/80"
                            strokeWidth="1.2"
                            vectorEffect="non-scaling-stroke"
                          />
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
                          className="absolute inset-0 grid gap-x-0"
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
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-[44px_minmax(0,1fr)] gap-1">
                      <span aria-hidden="true" />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        {timelineAxisLabels.map((label, index) => (
                          <span key={`${label}-${index}`}>{label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary-contrast" />
                Wochentagsprofil
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {strongestWeekday
                  ? `Stärkster Wochentag: ${strongestWeekday.label} · ${formatCurrency(strongestWeekday.revenue)}`
                  : "Noch keine Umsätze im gewählten Zeitraum"}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasWeekdayRevenue ? (
                <>
                  <div className="grid grid-cols-7 gap-2">
                    {weekdayDistribution.map((entry) => (
                      <button
                        key={entry.day}
                        type="button"
                        className="flex flex-col items-center gap-1"
                        onMouseEnter={() => setHoveredWeekday(entry.day)}
                        onMouseLeave={() => setHoveredWeekday(null)}
                        onFocus={() => setHoveredWeekday(entry.day)}
                        onBlur={() => setHoveredWeekday(null)}
                        title={`${entry.label}: ${formatCurrency(entry.revenue)} (${entry.count} Tage)`}
                      >
                        <div
                          className={`h-24 w-full rounded border border-border/70 bg-background/40 overflow-hidden relative transition-colors ${
                            hoveredWeekday === entry.day ? "bg-accent/40" : ""
                          }`}
                        >
                          {entry.revenue > 0 ? (
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-primary/80"
                              style={{ height: `${Math.max(4, (entry.revenue / maxWeekdayRevenue) * 100)}%` }}
                            />
                          ) : null}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{entry.label}</span>
                      </button>
                    ))}
                  </div>
                  {activeWeekday ? (
                    <p className="text-xs text-muted-foreground">
                      Aktiv: <span className="font-medium text-foreground">{activeWeekday.label}</span> ·{" "}
                      {formatCurrency(activeWeekday.revenue)} · {activeWeekday.count} Tage
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Wochentagsdaten im gewählten Zeitraum.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary-contrast" />
                Top-Artikel
              </CardTitle>
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
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary-contrast" />
                Kategorien
              </CardTitle>
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

          <Card className={`${DASHBOARD_CARD_SURFACE_CLASS} ${DASHBOARD_CARD_HOVER_CLASS}`}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cyan-300" />
                Zahlungsmix
              </CardTitle>
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

      </div>
    </FinanceModuleLayout>
  );
}
