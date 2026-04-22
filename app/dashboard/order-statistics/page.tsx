"use client";

import { useEffect, useState, useCallback } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { orderStatisticsApi, RevenueStatistics, TopItem, CategoryStatistics, HourlyStatistics } from "@/lib/api/order-statistics";
import { LoadingOverlay } from "@/components/loading-overlay";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";
import {
  TrendingUp,
  Euro,
  Award,
  BarChart3,
  DollarSign,
  Percent,
  Clock,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OrderStatisticsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revenueStats, setRevenueStats] = useState<RevenueStatistics | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStatistics>({});
  const [hourlyStats, setHourlyStats] = useState<HourlyStatistics>({});

  const initialDateRange = {
    start: format(startOfDay(subDays(new Date(), 7)), "yyyy-MM-dd"),
    end: format(endOfDay(new Date()), "yyyy-MM-dd"),
  };

  const [appliedDateRange, setAppliedDateRange] = useState<{
    start: string;
    end: string;
  }>(initialDateRange);
  const [draftDateRange, setDraftDateRange] = useState<{
    start: string;
    end: string;
  }>(initialDateRange);

  const loadData = useCallback(async () => {
    if (!restaurant) return;

    setIsLoading(true);
    try {
      const overview = await orderStatisticsApi.getOverview(restaurant.id, {
        start_date: `${appliedDateRange.start}T00:00:00Z`,
        end_date: `${appliedDateRange.end}T23:59:59Z`,
        limit: 10,
      });

      setRevenueStats(overview.revenue);
      setTopItems(overview.top_items);
      setCategoryStats(overview.category_statistics);
      setHourlyStats(overview.hourly_statistics);
    } catch (error) {
      console.error("Fehler beim Laden der Statistiken:", error);
    } finally {
      setIsLoading(false);
    }
  }, [restaurant, appliedDateRange]);

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const restaurants = await restaurantsApi.list();
        if (restaurants.length > 0) {
          setRestaurant(restaurants[0]);
        }
      } catch (error) {
        console.error("Fehler beim Laden des Restaurants:", error);
      }
    };

    loadRestaurant();
  }, []);

  useEffect(() => {
    if (restaurant) {
      loadData();
    }
  }, [restaurant, loadData]);

  const isDraftRangeValid =
    draftDateRange.start.length > 0 &&
    draftDateRange.end.length > 0 &&
    draftDateRange.start <= draftDateRange.end;
  const hasPendingRangeChanges =
    draftDateRange.start !== appliedDateRange.start ||
    draftDateRange.end !== appliedDateRange.end;

  const handleRefresh = useCallback(() => {
    if (!restaurant || isLoading || !isDraftRangeValid) return;

    if (hasPendingRangeChanges) {
      setAppliedDateRange({ ...draftDateRange });
      return;
    }

    void loadData();
  }, [
    restaurant,
    isLoading,
    isDraftRangeValid,
    hasPendingRangeChanges,
    draftDateRange,
    loadData,
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatCategoryLabel = (category: string | null | undefined) => {
    const normalizedCategory = (category ?? "").trim();
    if (!normalizedCategory || /^uncategorized$/i.test(normalizedCategory)) {
      return "Ohne Kategorie";
    }
    return normalizedCategory;
  };

  const maxTopItemRevenue = Math.max(...topItems.map((item) => Number(item.revenue) || 0), 1);
  const maxCategoryRevenue = Math.max(
    ...Object.values(categoryStats).map((stats) => Number(stats.revenue) || 0),
    1
  );

  if (isLoading && !restaurant) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/50 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
              <BarChart3 className="w-8 h-8" />
              Bestellstatistiken
            </h1>
            <p className="text-sm text-muted-foreground">
              Übersicht über Umsatz, Top-Artikel und Trends
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={draftDateRange.start}
              onChange={(e) =>
                setDraftDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="bg-muted border-input text-foreground"
            />
            <span className="text-muted-foreground">bis</span>
            <Input
              type="date"
              value={draftDateRange.end}
              onChange={(e) =>
                setDraftDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="bg-muted border-input text-foreground"
            />
            <Button
              onClick={handleRefresh}
              disabled={isLoading || !isDraftRangeValid}
              className="bg-primary hover:bg-primary/90"
            >
              {hasPendingRangeChanges ? "Anwenden" : "Aktualisieren"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {revenueStats ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Gesamtumsatz</span>
                  <Euro className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(revenueStats.total_revenue)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {revenueStats.total_orders} Bestellungen
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Durchschnittlicher Bestellwert</span>
                  <TrendingUp className="w-5 h-5 text-primary-contrast" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(revenueStats.average_order_value)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">pro Bestellung</div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Trinkgeld</span>
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(revenueStats.total_tips)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {revenueStats.total_tips > 0
                    ? `${((revenueStats.total_tips / revenueStats.total_revenue) * 100).toFixed(1)}% vom Umsatz`
                    : "Kein Trinkgeld"}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Rabatte</span>
                  <Percent className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(revenueStats.total_discounts)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Gesamt gegeben</div>
              </div>
            </div>

            {/* Top Artikel */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="w-6 h-6" />
                Meistverkaufte Artikel
              </h2>
              {topItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Daten für den ausgewählten Zeitraum
                </div>
              ) : (
                <div className="space-y-2">
                  {topItems.map((item) => (
                    <div
                      key={item.item_name}
                      className="relative overflow-hidden flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 transition-colors duration-200 ease-out hover:bg-accent/60"
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-0 bg-primary/10"
                        style={{ width: `${Math.max(0, Math.min(100, (Number(item.revenue) / maxTopItemRevenue) * 100))}%` }}
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
            </div>

            {/* Kategorien */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Umsatz nach Kategorien
              </h2>
              {Object.keys(categoryStats).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Daten für den ausgewählten Zeitraum
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categoryStats)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([category, stats]) => (
                      <div
                        key={category}
                        className="space-y-1.5 rounded-md border border-border/70 bg-background/30 p-2.5 transition-colors duration-200 ease-out hover:bg-accent/60"
                      >
                        <div className="flex items-center justify-between text-sm gap-2">
                          <span className="text-foreground truncate">{formatCategoryLabel(category)}</span>
                          <span className="font-medium text-foreground">{formatCurrency(stats.revenue)}</span>
                        </div>
                        <div className="h-2.5 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/80"
                            style={{ width: `${Math.max(2, (Number(stats.revenue) / maxCategoryRevenue) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{stats.quantity} Positionen</p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Stunden-Statistiken */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Umsatz nach Stunden
              </h2>
              <div className="grid grid-cols-12 gap-2">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourKey = String(hour);
                  const stats = hourlyStats[hourKey] || { order_count: 0, revenue: 0 };
                  const maxRevenue = Math.max(
                    ...Object.values(hourlyStats).map((s) => s.revenue),
                    1
                  );
                  const height = maxRevenue > 0 ? (stats.revenue / maxRevenue) * 100 : 0;

                  return (
                    <div key={hour} className="flex flex-col items-center">
                      <div className="w-full h-24 bg-background/50 rounded-md border border-border relative overflow-hidden">
                        {stats.revenue > 0 && (
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-primary transition-all"
                            style={{ height: `${height}%` }}
                          />
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-end p-2 z-10">
                          {stats.order_count > 0 && (
                            <>
                              <div className="text-xs font-semibold text-foreground">
                                {formatCurrency(stats.revenue)}
                              </div>
                              <div className="text-xs text-muted-foreground">{stats.order_count}</div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">{String(hour).padStart(2, "0")}:00</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Keine Daten verfügbar
            </h2>
            <p className="text-muted-foreground">Laden Sie Daten für einen Zeitraum</p>
          </div>
        )}
      </div>
    </div>
  );
}
