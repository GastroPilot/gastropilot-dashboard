"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CookingPot,
  Euro,
  LayoutGrid,
  Percent,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react";
import { authApi, type User } from "@/lib/api/auth";
import { impersonation } from "@/lib/api/admin";
import { restaurantsApi } from "@/lib/api/restaurants";
import { useDashboardOverviewData, type OverviewRangePreset } from "@/lib/hooks/queries";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RANGE_PRESETS: Array<{ id: OverviewRangePreset; label: string }> = [
  { id: "today", label: "Heute" },
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "custom", label: "Benutzerdefiniert" },
];

const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  sent_to_kitchen: "An Küche gesendet",
  in_preparation: "In Zubereitung",
  ready: "Bereit",
  served: "Serviert",
  paid: "Bezahlt",
  canceled: "Storniert",
  unknown: "Unbekannt",
};

const DASHBOARD_CARD_HOVER_CLASS =
  "transform-gpu shadow-md shadow-black/5 transition-all duration-200 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10";
const DASHBOARD_ROW_HOVER_CLASS =
  "transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-accent/60";

const TOOLTIP_X_OFFSET = 12;
const TOOLTIP_Y_OFFSET = 12;
const TOOLTIP_EDGE_PADDING = 12;
const TOOLTIP_ESTIMATED_WIDTH = 220;
const TOOLTIP_ESTIMATED_HEIGHT = 38;
const TOOLTIP_Z_INDEX = 9999;
const REVENUE_STROKE_WIDTH = 1.2;

function getAdaptiveTooltipPosition(
  anchorX: number,
  anchorY: number,
  tooltipWidth: number,
  tooltipHeight: number
): { left: number; top: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = anchorX + TOOLTIP_X_OFFSET;
  if (left + tooltipWidth > viewportWidth - TOOLTIP_EDGE_PADDING) {
    left = anchorX - tooltipWidth - TOOLTIP_X_OFFSET;
  }
  if (left < TOOLTIP_EDGE_PADDING) {
    left = Math.max(
      TOOLTIP_EDGE_PADDING,
      Math.min(anchorX - tooltipWidth / 2, viewportWidth - tooltipWidth - TOOLTIP_EDGE_PADDING)
    );
  }

  let top = anchorY - tooltipHeight - TOOLTIP_Y_OFFSET;
  if (top < TOOLTIP_EDGE_PADDING) {
    top = anchorY + TOOLTIP_Y_OFFSET;
  }
  if (top + tooltipHeight > viewportHeight - TOOLTIP_EDGE_PADDING) {
    top = viewportHeight - tooltipHeight - TOOLTIP_EDGE_PADDING;
  }
  if (top < TOOLTIP_EDGE_PADDING) {
    top = TOOLTIP_EDGE_PADDING;
  }

  return { left, top };
}

function AdaptiveHoverTooltip({
  anchorX,
  anchorY,
  children,
}: {
  anchorX: number;
  anchorY: number;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ width: TOOLTIP_ESTIMATED_WIDTH, height: TOOLTIP_ESTIMATED_HEIGHT });
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const nextWidth = Math.ceil(rect.width);
    const nextHeight = Math.ceil(rect.height);
    if (nextWidth !== size.width || nextHeight !== size.height) {
      setSize({ width: nextWidth, height: nextHeight });
    }
  }, [mounted, size.height, size.width, anchorX, anchorY, children]);

  if (!mounted) return null;

  const { left, top } = getAdaptiveTooltipPosition(anchorX, anchorY, size.width, size.height);

  return createPortal(
    <div
      ref={tooltipRef}
      className="pointer-events-none fixed max-w-[260px] rounded-md border border-border bg-popover/95 px-2 py-1 text-[11px] font-semibold text-foreground shadow-sm"
      style={{ left: `${left}px`, top: `${top}px`, zIndex: TOOLTIP_Z_INDEX }}
    >
      {children}
    </div>,
    document.body
  );
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value);
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatGermanDate(value: string, includeYear = false): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, includeYear ? "dd.MM.yyyy" : "dd.MM", { locale: de });
}

function KpiCard({
  label,
  value,
  hint,
  href,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  icon?: ReactNode;
}) {
  const content = (
    <Card
      className={`relative z-0 border-border bg-card/70 h-full hover:z-40 focus-within:z-40 ${DASHBOARD_CARD_HOVER_CLASS} ${
        href ? "hover:bg-card hover:border-primary/50" : "hover:bg-card/80 hover:border-primary/30"
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`Zu ${label}`}
    >
      {content}
    </Link>
  );
}

function RevenueTrendKpiCard({
  label,
  value,
  hint,
  href,
  icon,
  trendData,
  unavailable,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  icon?: ReactNode;
  trendData: Array<{ key: string; shortLabel: string; tooltipLabel: string; revenue: number }>;
  unavailable: boolean;
  loading: boolean;
}) {
  const gradientId = useId();
  const hasTrendData = !unavailable && trendData.length > 1;
  const xAxisLabels = useMemo(() => {
    if (!hasTrendData || trendData.length === 0) return [] as string[];
    const first = trendData[0]?.shortLabel ?? "";
    const middle = trendData[Math.floor((trendData.length - 1) / 2)]?.shortLabel ?? "";
    const last = trendData[trendData.length - 1]?.shortLabel ?? "";
    return [first, middle, last];
  }, [hasTrendData, trendData]);
  const [hoveredRevenueDate, setHoveredRevenueDate] = useState<string | null>(null);
  const [trendTooltip, setTrendTooltip] = useState<{
    anchorX: number;
    anchorY: number;
    tooltipLabel: string;
    revenue: number;
  } | null>(null);
  const maxRevenue = hasTrendData ? Math.max(...trendData.map((entry) => entry.revenue), 1) : 1;
  const minRevenue = hasTrendData ? Math.min(...trendData.map((entry) => entry.revenue), 0) : 0;
  const spread = Math.max(maxRevenue - minRevenue, 1);
  const points = hasTrendData
    ? trendData.map((entry, index) => {
        const x = trendData.length === 1 ? 50 : (index / (trendData.length - 1)) * 100;
        const normalized = (entry.revenue - minRevenue) / spread;
        const y = 80 - normalized * 56;
        return { x, y };
      })
    : [];
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `M ${points[0].x} 80 L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${points[points.length - 1].x} 80 Z`
      : "";

  const content = (
    <Card
      className={`relative z-0 border-border bg-card/70 h-full hover:z-40 focus-within:z-40 ${DASHBOARD_CARD_HOVER_CLASS} ${
        href ? "hover:bg-card hover:border-primary/50" : "hover:bg-card/80 hover:border-primary/30"
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="relative min-h-[120px] space-y-1 overflow-hidden">
        {trendTooltip ? (
          <AdaptiveHoverTooltip anchorX={trendTooltip.anchorX} anchorY={trendTooltip.anchorY}>
            {trendTooltip.tooltipLabel}: {formatCurrency(trendTooltip.revenue)}
          </AdaptiveHoverTooltip>
        ) : null}
        {hasTrendData ? (
          <div className="absolute inset-x-3 bottom-2 top-12">
            <div className="absolute inset-x-0 bottom-4 top-0">
              <svg
                viewBox="0 0 100 84"
                preserveAspectRatio="none"
                className="pointer-events-none h-full w-full opacity-80"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
                  </linearGradient>
                </defs>
                <line
                  x1="0"
                  y1="80"
                  x2="100"
                  y2="80"
                  stroke="currentColor"
                  className="text-border/90"
                  strokeWidth={REVENUE_STROKE_WIDTH}
                  vectorEffect="non-scaling-stroke"
                />
                <path d={areaPath} fill={`url(#${gradientId})`} className="text-primary" />
                <polyline
                  fill="none"
                  points={polyline}
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth={REVENUE_STROKE_WIDTH}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div
                className="absolute inset-0 grid gap-x-0"
                style={{ gridTemplateColumns: `repeat(${trendData.length}, minmax(0, 1fr))` }}
              >
                {trendData.map((entry) => (
                  <div
                    key={entry.key}
                    className={`h-full rounded-sm transition-colors ${
                      hoveredRevenueDate === entry.key ? "bg-primary/10" : "hover:bg-accent/40"
                    }`}
                    onMouseEnter={(event) => {
                      setHoveredRevenueDate(entry.key);
                      setTrendTooltip({
                        anchorX: event.clientX,
                        anchorY: event.clientY,
                        tooltipLabel: entry.tooltipLabel,
                        revenue: entry.revenue,
                      });
                    }}
                    onMouseMove={(event) => {
                      setHoveredRevenueDate(entry.key);
                      setTrendTooltip({
                        anchorX: event.clientX,
                        anchorY: event.clientY,
                        tooltipLabel: entry.tooltipLabel,
                        revenue: entry.revenue,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredRevenueDate(null);
                      setTrendTooltip(null);
                    }}
                    title={`${entry.tooltipLabel}: ${formatCurrency(entry.revenue)}`}
                  />
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between text-[10px] text-muted-foreground">
              {xAxisLabels.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={`pointer-events-none absolute inset-x-3 bottom-2 top-12 rounded-md border border-dashed border-border/60 ${
              loading ? "animate-pulse" : ""
            }`}
          />
        )}
        <div className="relative z-10 space-y-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`Zu ${label}`}
    >
      {content}
    </Link>
  );
}

function DistributionKpiCard({
  label,
  value,
  hint,
  href,
  icon,
  distribution,
  unavailable,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  icon?: ReactNode;
  distribution: Array<{ key: string; shortLabel: string; tooltipLabel: string; count: number }>;
  unavailable: boolean;
  loading: boolean;
}) {
  const maxCount = distribution.length > 0 ? Math.max(...distribution.map((entry) => entry.count), 1) : 1;
  const showDistribution = !unavailable && distribution.length > 0;
  const [hoveredDistributionDate, setHoveredDistributionDate] = useState<string | null>(null);
  const [distributionTooltip, setDistributionTooltip] = useState<{
    anchorX: number;
    anchorY: number;
    tooltipLabel: string;
    count: number;
  } | null>(null);

  const setDistributionTooltipFromMouse = (
    event: MouseEvent<HTMLDivElement>,
    entry: { key: string; shortLabel: string; tooltipLabel: string; count: number }
  ) => {
    setDistributionTooltip({
      anchorX: event.clientX,
      anchorY: event.clientY,
      tooltipLabel: entry.tooltipLabel,
      count: entry.count,
    });
  };

  const content = (
    <Card
      className={`border-border bg-card/70 h-full ${DASHBOARD_CARD_HOVER_CLASS} ${
        href ? "hover:bg-card hover:border-primary/50" : "hover:bg-card/80 hover:border-primary/30"
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        {showDistribution ? (
          <div className="relative space-y-1 overflow-x-hidden">
            {distributionTooltip ? (
              <AdaptiveHoverTooltip
                anchorX={distributionTooltip.anchorX}
                anchorY={distributionTooltip.anchorY}
              >
                {distributionTooltip.tooltipLabel}: {distributionTooltip.count}
              </AdaptiveHoverTooltip>
            ) : null}
            <div className="relative h-10" aria-label={`${label} Verteilung im Zeitraum`}>
              <div
                className="pointer-events-none grid h-full items-end gap-x-0"
                style={{ gridTemplateColumns: `repeat(${distribution.length}, minmax(0, 1fr))` }}
              >
                {distribution.map((entry) => (
                  <span
                    key={entry.key}
                    className={`block w-3/5 mx-auto rounded-t transition-opacity ${
                      hoveredDistributionDate === entry.key ? "bg-primary opacity-100" : "bg-primary/75 opacity-90"
                    }`}
                    style={{ height: `${Math.max(4, (entry.count / maxCount) * 36)}px` }}
                  />
                ))}
              </div>
              <div
                className="absolute inset-0 grid gap-x-0"
                style={{ gridTemplateColumns: `repeat(${distribution.length}, minmax(0, 1fr))` }}
              >
                {distribution.map((entry) => (
                  <div
                    key={entry.key}
                    className={`h-full rounded-sm transition-colors ${
                      hoveredDistributionDate === entry.key ? "bg-primary/10" : "hover:bg-accent/40"
                    }`}
                    onMouseEnter={(event) => {
                      setHoveredDistributionDate(entry.key);
                      setDistributionTooltipFromMouse(event, entry);
                    }}
                    onMouseMove={(event) => {
                      setHoveredDistributionDate(entry.key);
                      setDistributionTooltipFromMouse(event, entry);
                    }}
                    onMouseLeave={() => {
                      setHoveredDistributionDate(null);
                      setDistributionTooltip(null);
                    }}
                    title={`${entry.tooltipLabel}: ${entry.count}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{distribution[0].shortLabel}</span>
              <span>{distribution[distribution.length - 1].shortLabel}</span>
            </div>
          </div>
        ) : (
          <div
            className={`h-10 rounded border border-border bg-background/40 ${
              loading ? "animate-pulse" : ""
            }`}
          />
        )}
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`Zu ${label}`}
    >
      {content}
    </Link>
  );
}

function OccupancyDonutCard({
  occupancyRateNow,
  occupiedTablesNow,
  totalTables,
  blockedTablesNow,
  totalCapacity,
  guestsNow,
  capacityOccupancyRateNow,
  unavailable,
  loading,
  href,
}: {
  occupancyRateNow: number;
  occupiedTablesNow: number;
  totalTables: number;
  blockedTablesNow: number;
  totalCapacity: number;
  guestsNow: number;
  capacityOccupancyRateNow: number;
  unavailable: boolean;
  loading: boolean;
  href: string;
}) {
  const progress = unavailable ? 0 : Math.max(0, Math.min(100, occupancyRateNow));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progressLength = (progress / 100) * circumference;
  const progressValue = unavailable ? (loading ? "..." : "-") : `${formatNumber(progress)}%`;
  const hint = unavailable
    ? "Operative Daten laden oder nicht verfügbar"
    : `${occupiedTablesNow} von ${totalTables} Tischen belegt`;

  return (
    <Link
      href={href}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Zu Tischauslastung jetzt"
    >
      <Card
        className={`border-border bg-card/70 h-full ${DASHBOARD_CARD_HOVER_CLASS} hover:bg-card hover:border-primary/50`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tischauslastung jetzt</p>
            <span className="text-muted-foreground">
              <LayoutGrid className="w-4 h-4" />
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" aria-hidden="true">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  className="text-muted-foreground/30"
                  strokeWidth="10"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  className="text-primary transition-all duration-200"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${progressLength} ${Math.max(0, circumference - progressLength)}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-base font-bold text-foreground">{progressValue}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{hint}</p>
              <p className="text-xs text-muted-foreground">
                Blockiert: {unavailable ? "-" : formatNumber(blockedTablesNow)}
              </p>
              <p className="text-xs text-muted-foreground">
                Personen:{" "}
                {unavailable
                  ? "-"
                  : `${formatNumber(guestsNow)} / ${formatNumber(totalCapacity)} (${formatNumber(
                      capacityOccupancyRateNow
                    )}%)`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NoShowCancellationDonutCard({
  noShowRate,
  cancellationRate,
  unavailable,
  loading,
  href,
}: {
  noShowRate: number;
  cancellationRate: number;
  unavailable: boolean;
  loading: boolean;
  href: string;
}) {
  const noShow = unavailable ? 0 : Math.max(0, Math.min(100, noShowRate));
  const cancellation = unavailable ? 0 : Math.max(0, Math.min(100, cancellationRate));
  const combined = Math.max(0, Math.min(100, noShow + cancellation));
  const noShowValue = unavailable ? (loading ? "..." : "-") : `${formatNumber(noShow)}%`;
  const cancellationValue = unavailable ? (loading ? "..." : "-") : `${formatNumber(cancellation)}%`;
  const combinedValue = unavailable ? (loading ? "..." : "-") : `${formatNumber(combined)}%`;
  const stackTotal = Math.max(100, noShow + cancellation);
  const noShowSegment = unavailable ? 0 : (noShow / stackTotal) * 100;
  const cancellationSegment = unavailable ? 0 : (cancellation / stackTotal) * 100;
  const restSegment = Math.max(0, 100 - noShowSegment - cancellationSegment);

  return (
    <Link
      href={href}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Zu No-Show und Storno"
    >
      <Card
        className={`border-border bg-card/70 h-full ${DASHBOARD_CARD_HOVER_CLASS} hover:bg-card hover:border-primary/50`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">No-Show / Storno</p>
            <span className="text-muted-foreground">
              <Percent className="w-4 h-4" />
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            <div className="h-4 w-full overflow-hidden rounded-full bg-muted-foreground/20">
              <div className="flex h-full w-full">
                <span
                  className="h-full bg-amber-500 transition-all duration-200"
                  style={{ width: `${noShowSegment}%` }}
                  title={`No-Show: ${noShowValue}`}
                />
                <span
                  className="h-full bg-rose-500 transition-all duration-200"
                  style={{ width: `${cancellationSegment}%` }}
                  title={`Storno: ${cancellationValue}`}
                />
                <span className="h-full bg-muted-foreground/20" style={{ width: `${restSegment}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <p className="text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1.5" />
                No-Show: <span className="font-semibold text-foreground">{noShowValue}</span>
              </p>
              <p className="text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500 mr-1.5" />
                Storno: <span className="font-semibold text-foreground">{cancellationValue}</span>
              </p>
              <p className="text-muted-foreground text-right">
                Gesamt: <span className="font-semibold text-foreground">{combinedValue}</span>
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {unavailable ? "Operative Daten laden oder nicht verfügbar" : "Anteil auf Tagesreservierungen"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardLandingPage() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rangePreset, setRangePreset] = useState<OverviewRangePreset>("30d");
  const [customFrom, setCustomFrom] = useState<string>(format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [hoveredRevenueDate, setHoveredRevenueDate] = useState<string | null>(null);
  const [revenueTooltip, setRevenueTooltip] = useState<{
    anchorX: number;
    anchorY: number;
    tooltipLabel: string;
    revenue: number;
  } | null>(null);
  const [hoveredHourlyHour, setHoveredHourlyHour] = useState<string | null>(null);
  const [hourlyTooltip, setHourlyTooltip] = useState<{
    anchorX: number;
    anchorY: number;
    hour: string;
    orderCount: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadContext() {
      try {
        const user = await authApi.getCurrentUser();
        if (!mounted) return;
        setCurrentUser(user);

        if (user.role === "platform_admin" && !impersonation.isActive()) {
          setRestaurantId(null);
          return;
        }

        const restaurants = await restaurantsApi.list();
        if (!mounted) return;
        setRestaurantId(restaurants[0]?.id ?? null);
      } catch {
        if (!mounted) return;
        setRestaurantId(null);
      } finally {
        if (mounted) setRestaurantsLoaded(true);
      }
    }

    loadContext();

    return () => {
      mounted = false;
    };
  }, []);

  const overviewQuery = useDashboardOverviewData({
    restaurantId: restaurantId ?? undefined,
    selectedDate,
    rangePreset,
    customFromDate: parseDateInput(customFrom),
    customToDate: parseDateInput(customTo),
    enabled: restaurantsLoaded && Boolean(restaurantId),
  });

  const overview = overviewQuery.data;

  const revenueTimeline = useMemo(() => {
    if (!overview) return [] as Array<{ key: string; axisLabel: string; tooltipLabel: string; revenue: number }>;

    if (rangePreset === "today") {
      return (overview.revenueByHour ?? []).map((entry) => {
        const hour = entry.hour.padStart(2, "0");
        return {
          key: hour,
          axisLabel: hour,
          tooltipLabel: `${hour}:00`,
          revenue: entry.revenue,
        };
      });
    }

    return overview.revenueByDay.map((entry) => ({
      key: entry.date,
      axisLabel: formatGermanDate(entry.date),
      tooltipLabel: formatGermanDate(entry.date, true),
      revenue: entry.revenue,
    }));
  }, [overview, rangePreset]);

  const revenueMax = useMemo(() => {
    if (revenueTimeline.length === 0) return 1;
    return Math.max(...revenueTimeline.map((entry) => entry.revenue), 1);
  }, [revenueTimeline]);

  const revenueAreaGradientId = useId();
  const hourlyAreaGradientId = useId();
  const revenuePointCount = revenueTimeline.length;
  const revenueChartHeightClass = revenuePointCount <= 7 ? "h-64" : "h-48";
  const revenueAxisLabelStep = useMemo(() => {
    if (revenuePointCount <= 1) return 1;
    if (rangePreset === "today") return 3;
    if (revenuePointCount <= 7) return 1;
    if (revenuePointCount <= 14) return 2;
    return Math.ceil(revenuePointCount / 8);
  }, [revenuePointCount, rangePreset]);
  const activeRevenueEntry = useMemo(() => {
    if (revenueTimeline.length === 0) return null;
    if (!hoveredRevenueDate) return null;
    return revenueTimeline.find((entry) => entry.key === hoveredRevenueDate) ?? null;
  }, [revenueTimeline, hoveredRevenueDate]);
  const revenueLinePoints = useMemo(() => {
    if (revenueTimeline.length === 0) {
      return [] as Array<{
        key: string;
        axisLabel: string;
        tooltipLabel: string;
        revenue: number;
        x: number;
        y: number;
      }>;
    }

    const plotTop = 8;
    const plotBottom = 92;
    const plotHeight = plotBottom - plotTop;

    if (revenueTimeline.length === 1) {
      const single = revenueTimeline[0];
      const y = plotBottom - (single.revenue / revenueMax) * plotHeight;
      return [{ ...single, x: 50, y }];
    }

    return revenueTimeline.map((entry, index) => {
      const x = (index / (revenueTimeline.length - 1)) * 100;
      const y = plotBottom - (entry.revenue / revenueMax) * plotHeight;
      return { ...entry, x, y };
    });
  }, [revenueMax, revenueTimeline]);
  const revenueSmoothPath = useMemo(() => {
    if (revenueLinePoints.length === 0) return "";
    return buildSmoothCurvePath(revenueLinePoints);
  }, [revenueLinePoints]);
  const revenueAreaPath = useMemo(() => {
    if (revenueLinePoints.length === 0 || !revenueSmoothPath) return "";
    const firstPoint = revenueLinePoints[0];
    const lastPoint = revenueLinePoints[revenueLinePoints.length - 1];
    return `${revenueSmoothPath} L ${lastPoint.x} 92 L ${firstPoint.x} 92 Z`;
  }, [revenueLinePoints, revenueSmoothPath]);

  const setRevenueTooltipFromMouse = (
    event: MouseEvent<HTMLButtonElement>,
    entry: { key: string; axisLabel: string; tooltipLabel: string; revenue: number }
  ) => {
    setRevenueTooltip({
      anchorX: event.clientX,
      anchorY: event.clientY,
      tooltipLabel: entry.tooltipLabel,
      revenue: entry.revenue,
    });
  };

  const setRevenueTooltipFromFocus = (
    event: FocusEvent<HTMLButtonElement>,
    entry: { key: string; axisLabel: string; tooltipLabel: string; revenue: number }
  ) => {
    const targetRect = event.currentTarget.getBoundingClientRect();

    setRevenueTooltip({
      anchorX: targetRect.left + targetRect.width / 2,
      anchorY: targetRect.top + targetRect.height / 2,
      tooltipLabel: entry.tooltipLabel,
      revenue: entry.revenue,
    });
  };

  const orderedStatuses = useMemo(() => {
    if (!overview) return [] as Array<[string, number]>;
    return Object.entries(overview.ordersByStatus).sort((a, b) => b[1] - a[1]);
  }, [overview]);
  const topItemsMaxRevenue = useMemo(() => {
    if (!overview || overview.topItems.length === 0) return 1;
    return Math.max(...overview.topItems.map((item) => item.revenue), 1);
  }, [overview]);
  const topCategoriesMaxRevenue = useMemo(() => {
    if (!overview || overview.topCategories.length === 0) return 1;
    return Math.max(...overview.topCategories.map((category) => category.revenue), 1);
  }, [overview]);
  const hourlyOrdersSorted = useMemo(() => {
    if (!overview) return [] as Array<{ hour: string; orderCount: number; revenue: number }>;
    return overview.hourlyOrders.slice().sort((a, b) => Number(a.hour) - Number(b.hour));
  }, [overview]);
  const hourlyOrdersMax = useMemo(() => {
    if (hourlyOrdersSorted.length === 0) return 1;
    return Math.max(...hourlyOrdersSorted.map((entry) => entry.orderCount), 1);
  }, [hourlyOrdersSorted]);
  const hourlyLinePoints = useMemo(() => {
    if (hourlyOrdersSorted.length === 0) return [] as Array<{ hour: string; orderCount: number; x: number; y: number }>;
    const plotTop = 8;
    const plotBottom = 92;
    const plotHeight = plotBottom - plotTop;

    if (hourlyOrdersSorted.length === 1) {
      const single = hourlyOrdersSorted[0];
      const y = plotBottom - (single.orderCount / hourlyOrdersMax) * plotHeight;
      return [{ hour: single.hour, orderCount: single.orderCount, x: 50, y }];
    }

    return hourlyOrdersSorted.map((entry, index) => {
      const x = (index / (hourlyOrdersSorted.length - 1)) * 100;
      const y = plotBottom - (entry.orderCount / hourlyOrdersMax) * plotHeight;
      return {
        hour: entry.hour,
        orderCount: entry.orderCount,
        x,
        y,
      };
    });
  }, [hourlyOrdersMax, hourlyOrdersSorted]);
  const activeHourlyPoint = useMemo(() => {
    if (!hoveredHourlyHour || hourlyLinePoints.length === 0) return null;
    return hourlyLinePoints.find((point) => point.hour === hoveredHourlyHour) ?? null;
  }, [hoveredHourlyHour, hourlyLinePoints]);
  const hourlySmoothPath = useMemo(() => {
    if (hourlyLinePoints.length === 0) return "";
    return buildSmoothCurvePath(hourlyLinePoints);
  }, [hourlyLinePoints]);
  const hourlyAreaPath = useMemo(() => {
    if (hourlyLinePoints.length === 0 || !hourlySmoothPath) return "";
    const firstPoint = hourlyLinePoints[0];
    const lastPoint = hourlyLinePoints[hourlyLinePoints.length - 1];
    return `${hourlySmoothPath} L ${lastPoint.x} 92 L ${firstPoint.x} 92 Z`;
  }, [hourlyLinePoints, hourlySmoothPath]);

  const setHourlyTooltipFromMouse = (
    event: MouseEvent<HTMLButtonElement>,
    entry: { hour: string; orderCount: number }
  ) => {
    setHourlyTooltip({
      anchorX: event.clientX,
      anchorY: event.clientY,
      hour: entry.hour,
      orderCount: entry.orderCount,
    });
  };

  const setHourlyTooltipFromFocus = (
    event: FocusEvent<HTMLButtonElement>,
    entry: { hour: string; orderCount: number }
  ) => {
    const targetRect = event.currentTarget.getBoundingClientRect();

    setHourlyTooltip({
      anchorX: targetRect.left + targetRect.width / 2,
      anchorY: targetRect.top + targetRect.height / 2,
      hour: entry.hour,
      orderCount: entry.orderCount,
    });
  };

  const selectedRangeLabel = useMemo(() => {
    return RANGE_PRESETS.find((preset) => preset.id === rangePreset)?.label ?? "Zeitraum";
  }, [rangePreset]);

  const revenueTrendData = useMemo(() => {
    if (!overview) return [] as Array<{ key: string; shortLabel: string; tooltipLabel: string; revenue: number }>;

    if (rangePreset === "today") {
      return (overview.revenueByHour ?? []).map((entry) => {
        const hour = entry.hour.padStart(2, "0");
        return {
          key: hour,
          shortLabel: hour,
          tooltipLabel: `${hour}:00`,
          revenue: entry.revenue,
        };
      });
    }

    return overview.revenueByDay.map((entry) => ({
      key: entry.date,
      shortLabel: formatGermanDate(entry.date),
      tooltipLabel: formatGermanDate(entry.date, true),
      revenue: entry.revenue,
    }));
  }, [overview, rangePreset]);

  const ordersDistributionData = useMemo(() => {
    if (!overview) return [] as Array<{ key: string; shortLabel: string; tooltipLabel: string; count: number }>;

    if (rangePreset === "today") {
      return (overview.ordersByHour ?? []).map((entry) => {
        const hour = entry.hour.padStart(2, "0");
        return {
          key: hour,
          shortLabel: hour,
          tooltipLabel: `${hour}:00`,
          count: entry.count,
        };
      });
    }

    return overview.ordersByDay.map((entry) => ({
      key: entry.date,
      shortLabel: formatGermanDate(entry.date),
      tooltipLabel: formatGermanDate(entry.date, true),
      count: entry.count,
    }));
  }, [overview, rangePreset]);

  const reservationsDistributionData = useMemo(() => {
    if (!overview) return [] as Array<{ key: string; shortLabel: string; tooltipLabel: string; count: number }>;

    if (rangePreset === "today") {
      return (overview.reservationsByHour ?? []).map((entry) => {
        const hour = entry.hour.padStart(2, "0");
        return {
          key: hour,
          shortLabel: hour,
          tooltipLabel: `${hour}:00`,
          count: entry.count,
        };
      });
    }

    return overview.reservationsByDay.map((entry) => ({
      key: entry.date,
      shortLabel: formatGermanDate(entry.date),
      tooltipLabel: formatGermanDate(entry.date, true),
      count: entry.count,
    }));
  }, [overview, rangePreset]);

  const getCardNavigationProps = (href: string) => ({
    role: "link" as const,
    tabIndex: 0,
    onClick: () => router.push(href),
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        router.push(href);
      }
    },
  });

  const operationsReady = Boolean(overviewQuery.operations.data);
  const analyticsReady = Boolean(overviewQuery.analytics.data);
  const operationsInitialLoading = overviewQuery.operations.isLoading && !operationsReady;
  const analyticsInitialLoading = overviewQuery.analytics.isLoading && !analyticsReady;

  if (!restaurantsLoaded) {
    return <LoadingOverlay />;
  }

  if (!restaurantId) {
    const isGrundstatus = currentUser?.role === "platform_admin";

    return (
      <div className="p-6 bg-background h-full flex items-center justify-center">
        <Card className="w-full max-w-xl border-border bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Kein Tenant-Kontext verfügbar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {isGrundstatus ? (
              <>
                <p>
                  Du bist aktuell im Plattform-Admin-Grundstatus. Bitte wähle zuerst einen Tenant,
                  um echte Dashboard-Daten zu sehen.
                </p>
                <Link
                  href="/dashboard/restaurants"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/80 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Zur Tenant-Verwaltung
                </Link>
              </>
            ) : (
              <>
                <p>
                  Es wurde kein Restaurant gefunden. Lege zuerst ein Restaurant an, damit wir
                  Dashboard-Daten laden können.
                </p>
                <Link
                  href="/dashboard/restaurants/create"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/80 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Restaurant anlegen
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (overviewQuery.isLoading && !overview) {
    return <LoadingOverlay message="Lade Dashboard-Übersicht..." />;
  }

  if (overviewQuery.error && !overview) {
    return (
      <div className="p-6 bg-background h-full">
        <Card className="max-w-2xl border-border bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Dashboard konnte nicht geladen werden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{overviewQuery.error.message}</p>
            <Button type="button" onClick={() => void overviewQuery.refetch()}>
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const analyticsUnavailable = !analyticsReady;
  const operationsUnavailable = !operationsReady;

  const analyticsValue = (value: string): string => {
    if (analyticsReady) return value;
    if (analyticsInitialLoading) return "...";
    return "-";
  };

  const operationsValue = (value: string): string => {
    if (operationsReady) return value;
    if (operationsInitialLoading) return "...";
    return "-";
  };

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-6">
        <Card className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS}`}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-7 h-7 text-primary" />
                  Dashboard-Übersicht
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Live-Kennzahlen mit echten Werten aus Reservierungen, Bestellungen, Tischen und Umsatzdaten.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void overviewQuery.refetch()}
                  disabled={overviewQuery.isFetching}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${overviewQuery.isFetching ? "animate-spin" : ""}`} />
                  Aktualisieren
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={format(selectedDate, "yyyy-MM-dd")}
                    onChange={(event) => {
                      const nextDate = parseDateInput(event.target.value);
                      if (nextDate) {
                        setSelectedDate(nextDate);
                        if (rangePreset !== "custom") {
                          setCustomTo(format(nextDate, "yyyy-MM-dd"));
                        }
                      }
                    }}
                    className="bg-transparent text-foreground outline-none"
                  />
                </label>

                <div className="inline-flex items-center rounded-lg border border-border bg-background p-1">
                  {RANGE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setRangePreset(preset.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        rangePreset === preset.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {rangePreset === "custom" ? (
                  <>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <span className="text-xs text-muted-foreground">Von</span>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(event) => setCustomFrom(event.target.value)}
                        className="bg-transparent text-foreground outline-none"
                      />
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <span className="text-xs text-muted-foreground">Bis</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(event) => setCustomTo(event.target.value)}
                        className="bg-transparent text-foreground outline-none"
                      />
                    </label>
                  </>
                ) : null}
              </div>

              <div className="text-xs text-muted-foreground">
                Zuletzt aktualisiert:{" "}
                {overview
                  ? format(new Date(overview.lastUpdatedAt), "dd.MM.yyyy HH:mm:ss", { locale: de })
                  : "-"}
              </div>
            </div>
          </CardContent>
        </Card>

        {overviewQuery.operations.error ? (
          <Card className="border-amber-500/40 bg-amber-500/10">
            <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-sm text-amber-100">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-300" />
                <span>Operative Widgets konnten nicht vollständig aktualisiert werden: {overviewQuery.operations.error.message}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => void overviewQuery.operations.refetch()}>
                Operativ neu laden
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {overviewQuery.analytics.error ? (
          <Card className="border-amber-500/40 bg-amber-500/10">
            <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-sm text-amber-100">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-300" />
                <span>Analytics-Widgets konnten nicht vollständig aktualisiert werden: {overviewQuery.analytics.error.message}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => void overviewQuery.analytics.refetch()}>
                Analytics neu laden
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {overview ? (
          <>
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Aktuelle Zustände
                  </h2>
                  <span className="text-xs text-muted-foreground">Unabhängig vom Zeitraum-Filter</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <KpiCard
                    label="Operativer Status"
                    value={operationsValue(`${formatNumber(overview.kpis.ordersOpen)} offen`)}
                    hint={
                      operationsUnavailable
                        ? "Operative Daten laden oder nicht verfügbar"
                        : `Kitchen-Backlog: ${formatNumber(overview.kpis.kitchenBacklog)}`
                    }
                    href="/dashboard/orders"
                    icon={<CookingPot className="w-4 h-4" />}
                  />
                  <NoShowCancellationDonutCard
                    noShowRate={overview.kpis.noShowRate}
                    cancellationRate={overview.kpis.cancellationRate}
                    unavailable={operationsUnavailable}
                    loading={operationsInitialLoading}
                    href="/dashboard/reservations"
                  />
                  <OccupancyDonutCard
                    occupancyRateNow={overview.kpis.occupancyRateNow}
                    occupiedTablesNow={overview.kpis.occupiedTablesNow}
                    totalTables={overview.kpis.tablesTotal}
                    blockedTablesNow={overview.kpis.blockedTablesNow}
                    totalCapacity={overview.kpis.totalCapacity}
                    guestsNow={overview.kpis.guestsNow}
                    capacityOccupancyRateNow={overview.kpis.capacityOccupancyRateNow}
                    unavailable={operationsUnavailable}
                    loading={operationsInitialLoading}
                    href="/dashboard/tischplan"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Zeitraum-Kennzahlen
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Filter: {selectedRangeLabel} ({overview.range.from} bis {overview.range.to})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <RevenueTrendKpiCard
                    label={`Umsatz (${selectedRangeLabel})`}
                    value={analyticsValue(formatCurrency(overview.kpis.revenueTotal))}
                    trendData={revenueTrendData}
                    unavailable={analyticsUnavailable}
                    loading={analyticsInitialLoading}
                    href="/dashboard/order-statistics"
                    icon={<Euro className="w-4 h-4" />}
                  />
                  <DistributionKpiCard
                    label={`Bestellungen (${selectedRangeLabel})`}
                    value={analyticsValue(formatNumber(overview.kpis.ordersTotal))}
                    hint={
                      analyticsUnavailable
                        ? "Analytics lädt oder nicht verfügbar"
                        : `Ø Bestellwert: ${formatCurrency(overview.kpis.avgOrderValue)}`
                    }
                    distribution={ordersDistributionData}
                    unavailable={analyticsUnavailable}
                    loading={analyticsInitialLoading}
                    href="/dashboard/orders"
                    icon={<ShoppingCart className="w-4 h-4" />}
                  />
                  <DistributionKpiCard
                    label={`Reservierungen (${selectedRangeLabel})`}
                    value={analyticsValue(formatNumber(overview.kpis.reservationsInRange))}
                    hint={
                      analyticsUnavailable
                        ? "Analytics lädt oder nicht verfügbar"
                        : `Gäste im Zeitraum: ${formatNumber(overview.kpis.guestsServedInRange)}`
                    }
                    distribution={reservationsDistributionData}
                    unavailable={analyticsUnavailable}
                    loading={analyticsInitialLoading}
                    href="/dashboard/reservations"
                    icon={<Users className="w-4 h-4" />}
                  />
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card
                {...getCardNavigationProps("/dashboard/order-statistics")}
                className={`relative z-0 xl:col-span-2 border-border bg-card/70 hover:z-40 focus-within:z-40 ${DASHBOARD_CARD_HOVER_CLASS} cursor-pointer hover:bg-card hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Umsatzverlauf</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!analyticsReady && analyticsInitialLoading ? (
                    <div className="grid grid-cols-12 gap-2 items-end min-h-40 animate-pulse">
                      {Array.from({ length: 12 }).map((_, index) => (
                        <div key={index} className="h-20 rounded bg-muted" />
                      ))}
                    </div>
                  ) : !analyticsReady && overviewQuery.analytics.error ? (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                      Umsatzverlauf konnte nicht geladen werden.
                    </div>
                  ) : revenueTimeline.length === 0 ? (
                    <div className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                      Keine Umsatzdaten im ausgewählten Zeitraum.
                    </div>
                  ) : (
                    <div className="relative overflow-x-hidden space-y-2">
                      {revenueTooltip ? (
                        <AdaptiveHoverTooltip
                          anchorX={revenueTooltip.anchorX}
                          anchorY={revenueTooltip.anchorY}
                        >
                          {revenueTooltip.tooltipLabel}:{" "}
                          {formatCurrency(revenueTooltip.revenue)}
                        </AdaptiveHoverTooltip>
                      ) : null}
                      <div className={`relative rounded-md border border-border bg-background/40 ${revenueChartHeightClass}`}>
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="absolute inset-0 h-full w-full"
                          aria-hidden="true"
                        >
                          <defs>
                            <linearGradient id={revenueAreaGradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
                              <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          <line
                            x1="0"
                            y1="92"
                            x2="100"
                            y2="92"
                            stroke="currentColor"
                            className="text-border"
                            strokeWidth={REVENUE_STROKE_WIDTH}
                            vectorEffect="non-scaling-stroke"
                          />
                          <line
                            x1="0"
                            y1="50"
                            x2="100"
                            y2="50"
                            stroke="currentColor"
                            className="text-border/60"
                            strokeWidth={REVENUE_STROKE_WIDTH}
                            vectorEffect="non-scaling-stroke"
                          />
                          {revenueAreaPath ? (
                            <path d={revenueAreaPath} fill={`url(#${revenueAreaGradientId})`} className="text-primary" />
                          ) : null}
                          {revenueSmoothPath ? (
                            <path
                              d={revenueSmoothPath}
                              fill="none"
                              stroke="currentColor"
                              className="text-primary"
                              strokeWidth={REVENUE_STROKE_WIDTH}
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          ) : null}
                        </svg>
                        <div
                          className="absolute inset-0 grid gap-x-0"
                          style={{
                            gridTemplateColumns: `repeat(${Math.max(1, revenueTimeline.length)}, minmax(0, 1fr))`,
                          }}
                        >
                          {revenueTimeline.map((entry) => (
                            <button
                              key={entry.key}
                              type="button"
                              className={`h-full w-full border-r border-border/40 last:border-r-0 transition-colors ${
                                activeRevenueEntry?.key === entry.key
                                  ? "bg-primary/10"
                                  : "hover:bg-accent/40"
                              }`}
                              title={`${entry.tooltipLabel}: ${formatCurrency(entry.revenue)}`}
                              aria-label={`Umsatz ${entry.tooltipLabel}: ${formatCurrency(entry.revenue)}`}
                              onMouseEnter={(event) => {
                                setHoveredRevenueDate(entry.key);
                                setRevenueTooltipFromMouse(event, entry);
                              }}
                              onMouseMove={(event) => {
                                setHoveredRevenueDate(entry.key);
                                setRevenueTooltipFromMouse(event, entry);
                              }}
                              onMouseLeave={() => {
                                setHoveredRevenueDate(null);
                                setRevenueTooltip(null);
                              }}
                              onFocus={(event) => {
                                setHoveredRevenueDate(entry.key);
                                setRevenueTooltipFromFocus(event, entry);
                              }}
                              onBlur={() => {
                                setHoveredRevenueDate(null);
                                setRevenueTooltip(null);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div
                        className="grid gap-x-0 px-0.5"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(1, revenueTimeline.length)}, minmax(0, 1fr))`,
                        }}
                      >
                        {revenueTimeline.map((entry, index) => (
                          <span key={entry.key} className="text-center text-[10px] text-muted-foreground">
                            {index % revenueAxisLabelStep === 0 || index === revenueTimeline.length - 1
                              ? entry.axisLabel
                              : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card
                {...getCardNavigationProps("/dashboard/order-statistics")}
                className={`relative z-0 border-border bg-card/70 hover:z-40 focus-within:z-40 ${DASHBOARD_CARD_HOVER_CLASS} cursor-pointer hover:bg-card hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CookingPot className="w-5 h-5 text-primary" />
                      Top Artikel
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {!analyticsReady && analyticsInitialLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-12 rounded bg-muted" />
                      ))}
                    </div>
                  ) : !analyticsReady && overviewQuery.analytics.error ? (
                    <p className="text-amber-100">Top-Artikel konnten nicht geladen werden.</p>
                  ) : overview.topItems.length > 0 ? (
                    overview.topItems.map((item) => (
                      <div
                        key={item.name}
                        className={`relative overflow-hidden flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 bg-primary/10"
                          style={{ width: `${Math.max(0, Math.min(100, (item.revenue / topItemsMaxRevenue) * 100))}%` }}
                        />
                        <div className="relative z-10 min-w-0">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} verkauft</p>
                        </div>
                        <p className="relative z-10 font-semibold text-foreground">{formatCurrency(item.revenue)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Keine Verkaufsdaten im Zeitraum.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card
                {...getCardNavigationProps("/dashboard/orders")}
                className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS} cursor-pointer hover:bg-card hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      Bestellstatus
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {!analyticsReady && analyticsInitialLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-10 rounded bg-muted" />
                      ))}
                    </div>
                  ) : !analyticsReady && overviewQuery.analytics.error ? (
                    <p className="text-amber-100">Bestellstatus konnte nicht geladen werden.</p>
                  ) : orderedStatuses.length > 0 ? (
                    orderedStatuses.map(([status, count]) => (
                      <div
                        key={status}
                        className={`flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}
                      >
                        <span className="text-foreground">{STATUS_LABELS[status] ?? status}</span>
                        <span className="font-semibold text-foreground">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Keine Statusdaten verfügbar.</p>
                  )}
                </CardContent>
              </Card>

              <Card
                {...getCardNavigationProps("/dashboard/order-statistics")}
                className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS} cursor-pointer hover:bg-card hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Top Kategorien</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {!analyticsReady && analyticsInitialLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-10 rounded bg-muted" />
                      ))}
                    </div>
                  ) : !analyticsReady && overviewQuery.analytics.error ? (
                    <p className="text-amber-100">Kategorien konnten nicht geladen werden.</p>
                  ) : overview.topCategories.length > 0 ? (
                    overview.topCategories.map((category) => (
                      <div
                        key={category.category}
                        className={`relative overflow-hidden flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 ${DASHBOARD_ROW_HOVER_CLASS}`}
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 left-0 bg-primary/10"
                          style={{
                            width: `${Math.max(0, Math.min(100, (category.revenue / topCategoriesMaxRevenue) * 100))}%`,
                          }}
                        />
                        <div className="relative z-10">
                          <p className="font-medium text-foreground">
                            {!category.category || /^uncategorized$/i.test(category.category)
                              ? "Ohne Kategorie"
                              : category.category}
                          </p>
                          <p className="text-xs text-muted-foreground">{category.quantity} Artikel</p>
                        </div>
                        <p className="relative z-10 font-semibold text-foreground">{formatCurrency(category.revenue)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Keine Kategoriedaten verfügbar.</p>
                  )}
                </CardContent>
              </Card>

              <Card
                {...getCardNavigationProps("/dashboard/order-statistics")}
                className={`border-border bg-card/70 ${DASHBOARD_CARD_HOVER_CLASS} cursor-pointer hover:bg-card hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Stundenlast
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {!analyticsReady && analyticsInitialLoading ? (
                    <div className="space-y-2 animate-pulse">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-10 rounded bg-muted" />
                      ))}
                    </div>
                  ) : !analyticsReady && overviewQuery.analytics.error ? (
                    <p className="text-amber-100">Stundenlast konnte nicht geladen werden.</p>
                  ) : hourlyOrdersSorted.length > 0 ? (
                    <div className="relative space-y-2 overflow-x-hidden">
                      {hourlyTooltip ? (
                        <AdaptiveHoverTooltip
                          anchorX={hourlyTooltip.anchorX}
                          anchorY={hourlyTooltip.anchorY}
                        >
                          {hourlyTooltip.hour.padStart(2, "0")}:00 • {hourlyTooltip.orderCount} Bestellungen
                        </AdaptiveHoverTooltip>
                      ) : null}
                      <div className="relative h-36 rounded-md border border-border bg-background/40">
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="absolute inset-0 h-full w-full"
                          aria-hidden="true"
                        >
                          <defs>
                            <linearGradient id={hourlyAreaGradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                              <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
                            </linearGradient>
                          </defs>
                          <line
                            x1="0"
                            y1="92"
                            x2="100"
                            y2="92"
                            stroke="currentColor"
                            className="text-border"
                            strokeWidth={REVENUE_STROKE_WIDTH}
                            vectorEffect="non-scaling-stroke"
                          />
                          <line
                            x1="0"
                            y1="50"
                            x2="100"
                            y2="50"
                            stroke="currentColor"
                            className="text-border/60"
                            strokeWidth={REVENUE_STROKE_WIDTH}
                            vectorEffect="non-scaling-stroke"
                          />
                          {hourlyAreaPath ? (
                            <path d={hourlyAreaPath} fill={`url(#${hourlyAreaGradientId})`} className="text-primary" />
                          ) : null}
                          {hourlySmoothPath ? (
                            <path
                              d={hourlySmoothPath}
                              fill="none"
                              stroke="currentColor"
                              className="text-primary"
                              strokeWidth={REVENUE_STROKE_WIDTH}
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          ) : null}
                        </svg>
                        <div
                          className="absolute inset-0 grid gap-x-0"
                          style={{
                            gridTemplateColumns: `repeat(${hourlyOrdersSorted.length}, minmax(0, 1fr))`,
                          }}
                        >
                          {hourlyOrdersSorted.map((hour) => (
                            <button
                              key={hour.hour}
                              type="button"
                              className={`h-full w-full border-r border-border/40 last:border-r-0 transition-colors ${
                                activeHourlyPoint?.hour === hour.hour
                                  ? "bg-primary/10"
                                  : "hover:bg-accent/40"
                              }`}
                              title={`${hour.hour.padStart(2, "0")}:00 • ${hour.orderCount} Bestellungen`}
                              aria-label={`Stundenlast ${hour.hour.padStart(2, "0")}:00: ${hour.orderCount} Bestellungen`}
                              onMouseEnter={(event) => {
                                setHoveredHourlyHour(hour.hour);
                                setHourlyTooltipFromMouse(event, hour);
                              }}
                              onMouseMove={(event) => {
                                setHoveredHourlyHour(hour.hour);
                                setHourlyTooltipFromMouse(event, hour);
                              }}
                              onMouseLeave={() => {
                                setHoveredHourlyHour(null);
                                setHourlyTooltip(null);
                              }}
                              onFocus={(event) => {
                                setHoveredHourlyHour(hour.hour);
                                setHourlyTooltipFromFocus(event, hour);
                              }}
                              onBlur={() => {
                                setHoveredHourlyHour(null);
                                setHourlyTooltip(null);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div
                        className="grid gap-x-0 px-0.5"
                        style={{
                          gridTemplateColumns: `repeat(${hourlyOrdersSorted.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {hourlyOrdersSorted.map((hour, index) => (
                          <span key={hour.hour} className="text-center text-[10px] text-muted-foreground">
                            {index % 2 === 0 ? hour.hour.padStart(2, "0") : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Keine Stundenwerte verfügbar.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
