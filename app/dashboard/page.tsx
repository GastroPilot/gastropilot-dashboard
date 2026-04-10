"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
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
  { id: "custom", label: "Custom" },
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

function formatSyncTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return format(parsed, "HH:mm:ss", { locale: de });
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
      className={`border-border bg-card/70 h-full transition-colors ${
        href ? "hover:bg-card hover:border-primary/50" : ""
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

export default function DashboardLandingPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [rangePreset, setRangePreset] = useState<OverviewRangePreset>("30d");
  const [customFrom, setCustomFrom] = useState<string>(format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));

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

  const revenueMax = useMemo(() => {
    if (!overview || overview.revenueByDay.length === 0) return 1;
    return Math.max(...overview.revenueByDay.map((entry) => entry.revenue), 1);
  }, [overview]);

  const orderedStatuses = useMemo(() => {
    if (!overview) return [] as Array<[string, number]>;
    return Object.entries(overview.ordersByStatus).sort((a, b) => b[1] - a[1]);
  }, [overview]);

  const selectedRangeLabel = useMemo(() => {
    return RANGE_PRESETS.find((preset) => preset.id === rangePreset)?.label ?? "Zeitraum";
  }, [rangePreset]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Card className="border-border bg-card/70">
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
                <Link
                  href="/dashboard/tischplan"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Tischplan öffnen
                </Link>
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

              <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                <span>Sync-Strategie: Operativ alle 15s, Analytics alle 60s</span>
                <span>Operativ: {formatSyncTime(overviewQuery.operations.lastUpdatedAt)}</span>
                <span>Analytics: {formatSyncTime(overviewQuery.analytics.lastUpdatedAt)}</span>
                <span>Gesamt: {overview ? format(new Date(overview.lastUpdatedAt), "dd.MM.yyyy HH:mm:ss", { locale: de }) : "-"}</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                label="Umsatz Heute"
                value={analyticsValue(formatCurrency(overview.kpis.revenueToday))}
                hint={analyticsUnavailable ? "Analytics lädt oder nicht verfügbar" : format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
                href="/dashboard/order-statistics"
                icon={<Euro className="w-4 h-4" />}
              />
              <KpiCard
                label="Umsatz Letzte 7 Tage"
                value={analyticsValue(formatCurrency(overview.kpis.revenueLast7Days))}
                hint={analyticsUnavailable ? "Analytics lädt oder nicht verfügbar" : `${format(subDays(selectedDate, 6), "dd.MM.yyyy")} bis ${format(selectedDate, "dd.MM.yyyy")}`}
                href="/dashboard/order-statistics"
                icon={<Euro className="w-4 h-4" />}
              />
              <KpiCard
                label="Umsatz Letzte 30 Tage"
                value={analyticsValue(formatCurrency(overview.kpis.revenueLast30Days))}
                hint={analyticsUnavailable ? "Analytics lädt oder nicht verfügbar" : `${format(subDays(selectedDate, 29), "dd.MM.yyyy")} bis ${format(selectedDate, "dd.MM.yyyy")}`}
                href="/dashboard/order-statistics"
                icon={<Euro className="w-4 h-4" />}
              />
              <KpiCard
                label={`Umsatz (${selectedRangeLabel})`}
                value={analyticsValue(formatCurrency(overview.kpis.revenueTotal))}
                hint={analyticsUnavailable ? "Analytics lädt oder nicht verfügbar" : `${overview.range.from} bis ${overview.range.to}`}
                href="/dashboard/order-statistics"
                icon={<BarChart3 className="w-4 h-4" />}
              />

              <KpiCard
                label={`Bestellungen (${selectedRangeLabel})`}
                value={analyticsValue(formatNumber(overview.kpis.ordersTotal))}
                hint={
                  analyticsUnavailable
                    ? "Analytics lädt oder nicht verfügbar"
                    : `Ø Bestellwert: ${formatCurrency(overview.kpis.avgOrderValue)}`
                }
                href="/dashboard/orders"
                icon={<ShoppingCart className="w-4 h-4" />}
              />
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
              <KpiCard
                label="Reservierungen (Tag)"
                value={operationsValue(formatNumber(overview.kpis.reservationsToday))}
                hint={
                  operationsUnavailable
                    ? "Operative Daten laden oder nicht verfügbar"
                    : `Gäste gesamt: ${formatNumber(overview.kpis.guestsToday)}`
                }
                href="/dashboard/reservations"
                icon={<Calendar className="w-4 h-4" />}
              />
              <KpiCard
                label={`Reservierungen (${selectedRangeLabel})`}
                value={analyticsValue(formatNumber(overview.kpis.reservationsInRange))}
                hint={
                  analyticsUnavailable
                    ? "Analytics lädt oder nicht verfügbar"
                    : `Gäste im Zeitraum: ${formatNumber(overview.kpis.guestsServedInRange)}`
                }
                href="/dashboard/reservations"
                icon={<Users className="w-4 h-4" />}
              />

              <KpiCard
                label="No-Show / Storno"
                value={operationsValue(`${formatNumber(overview.kpis.noShowRate)}% / ${formatNumber(overview.kpis.cancellationRate)}%`)}
                hint={operationsUnavailable ? "Operative Daten laden oder nicht verfügbar" : "Anteil auf Tagesreservierungen"}
                href="/dashboard/reservations"
                icon={<Percent className="w-4 h-4" />}
              />
              <KpiCard
                label="Tischauslastung jetzt"
                value={operationsValue(`${formatNumber(overview.kpis.occupancyRateNow)}%`)}
                hint={
                  operationsUnavailable
                    ? "Operative Daten laden oder nicht verfügbar"
                    : `${overview.kpis.occupiedTablesNow} von ${overview.kpis.tablesTotal} Tischen belegt`
                }
                href="/dashboard/tischplan"
                icon={<LayoutGrid className="w-4 h-4" />}
              />
              <KpiCard
                label="Freie Tische jetzt"
                value={operationsValue(formatNumber(overview.kpis.freeTablesNow))}
                hint={
                  operationsUnavailable
                    ? "Operative Daten laden oder nicht verfügbar"
                    : `Blockiert: ${formatNumber(overview.kpis.blockedTablesNow)} · Kapazität: ${formatNumber(overview.kpis.totalCapacity)}`
                }
                href="/dashboard/tischplan"
                icon={<Clock className="w-4 h-4" />}
              />
              <KpiCard
                label="Aktive Blöcke jetzt"
                value={operationsValue(formatNumber(overview.kpis.blockedTablesNow))}
                hint={operationsUnavailable ? "Operative Daten laden oder nicht verfügbar" : "Tische mit laufender Blockierung"}
                href="/dashboard/tischplan"
                icon={<ShieldCheck className="w-4 h-4" />}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="xl:col-span-2 border-border bg-card/70">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">Umsatzverlauf</CardTitle>
                    <Link href="/dashboard/order-statistics" className="text-xs font-semibold text-primary hover:text-primary/80">
                      Details
                    </Link>
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
                  ) : overview.revenueByDay.length === 0 ? (
                    <div className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                      Keine Umsatzdaten im ausgewählten Zeitraum.
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 md:grid-cols-10 lg:grid-cols-12 gap-2 items-end min-h-40">
                      {overview.revenueByDay.map((entry) => (
                        <div key={entry.date} className="flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-primary/75"
                            style={{ height: `${Math.max(6, (entry.revenue / revenueMax) * 120)}px` }}
                            title={`${entry.date}: ${formatCurrency(entry.revenue)}`}
                          />
                          <span className="text-[10px] text-muted-foreground">{entry.date.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/70">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CookingPot className="w-5 h-5 text-primary" />
                      Top Artikel
                    </CardTitle>
                    <Link href="/dashboard/order-statistics" className="text-xs font-semibold text-primary hover:text-primary/80">
                      Details
                    </Link>
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
                      <div key={item.name} className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} verkauft</p>
                        </div>
                        <p className="font-semibold text-foreground">{formatCurrency(item.revenue)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Keine Verkaufsdaten im Zeitraum.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card className="border-border bg-card/70">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      Bestellstatus
                    </CardTitle>
                    <Link href="/dashboard/orders" className="text-xs font-semibold text-primary hover:text-primary/80">
                      Details
                    </Link>
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
                      <div key={status} className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2">
                        <span className="text-foreground">{STATUS_LABELS[status] ?? status}</span>
                        <span className="font-semibold text-foreground">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Keine Statusdaten verfügbar.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/70">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">Top Kategorien</CardTitle>
                    <Link href="/dashboard/order-statistics" className="text-xs font-semibold text-primary hover:text-primary/80">
                      Details
                    </Link>
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
                      <div key={category.category} className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2">
                        <div>
                          <p className="font-medium text-foreground">{category.category || "Ohne Kategorie"}</p>
                          <p className="text-xs text-muted-foreground">{category.quantity} Artikel</p>
                        </div>
                        <p className="font-semibold text-foreground">{formatCurrency(category.revenue)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Keine Kategoriedaten verfügbar.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/70">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Stundenlast
                    </CardTitle>
                    <Link href="/dashboard/order-statistics" className="text-xs font-semibold text-primary hover:text-primary/80">
                      Details
                    </Link>
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
                  ) : overview.hourlyOrders.length > 0 ? (
                    overview.hourlyOrders
                      .slice()
                      .sort((a, b) => b.orderCount - a.orderCount)
                      .slice(0, 6)
                      .map((hour) => (
                        <div key={hour.hour} className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2">
                          <span className="text-foreground">{hour.hour.padStart(2, "0")}:00</span>
                          <span className="font-semibold text-foreground">{hour.orderCount} Bestellungen</span>
                        </div>
                      ))
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
