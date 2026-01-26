"use client";

import { useEffect, useState, useCallback } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { orderStatisticsApi, RevenueStatistics, TopItem, CategoryStatistics, HourlyStatistics } from "@/lib/api/order-statistics";
import { LoadingOverlay } from "@/components/loading-overlay";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";
import {
  TrendingUp,
  ShoppingCart,
  Euro,
  Award,
  BarChart3,
  Calendar,
  DollarSign,
  TrendingDown,
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

  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: format(startOfDay(subDays(new Date(), 7)), "yyyy-MM-dd"),
    end: format(endOfDay(new Date()), "yyyy-MM-dd"),
  });

  const loadData = useCallback(async () => {
    if (!restaurant) return;

    setIsLoading(true);
    try {
      const [revenue, items, categories, hourly] = await Promise.all([
        orderStatisticsApi.getRevenue(restaurant.id, {
          start_date: `${dateRange.start}T00:00:00Z`,
          end_date: `${dateRange.end}T23:59:59Z`,
        }),
        orderStatisticsApi.getTopItems(restaurant.id, {
          start_date: `${dateRange.start}T00:00:00Z`,
          end_date: `${dateRange.end}T23:59:59Z`,
          limit: 10,
        }),
        orderStatisticsApi.getCategoryStatistics(restaurant.id, {
          start_date: `${dateRange.start}T00:00:00Z`,
          end_date: `${dateRange.end}T23:59:59Z`,
        }),
        orderStatisticsApi.getHourlyStatistics(restaurant.id, {
          start_date: `${dateRange.start}T00:00:00Z`,
          end_date: `${dateRange.end}T23:59:59Z`,
        }),
      ]);

      setRevenueStats(revenue);
      setTopItems(items);
      setCategoryStats(categories);
      setHourlyStats(hourly);
    } catch (error) {
      console.error("Fehler beim Laden der Statistiken:", error);
    } finally {
      setIsLoading(false);
    }
  }, [restaurant, dateRange]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  if (isLoading && !restaurant) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-700 bg-gray-800/50 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
              <BarChart3 className="w-8 h-8" />
              Bestellstatistiken
            </h1>
            <p className="text-sm text-gray-400">
              Übersicht über Umsatz, Top-Artikel und Trends
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <span className="text-gray-400">bis</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Button
              onClick={loadData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Aktualisieren
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
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Gesamtumsatz</span>
                  <Euro className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(revenueStats.total_revenue)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {revenueStats.total_orders} Bestellungen
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Durchschnittlicher Bestellwert</span>
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(revenueStats.average_order_value)}
                </div>
                <div className="text-xs text-gray-500 mt-1">pro Bestellung</div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Trinkgeld</span>
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(revenueStats.total_tips)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {revenueStats.total_tips > 0
                    ? `${((revenueStats.total_tips / revenueStats.total_revenue) * 100).toFixed(1)}% vom Umsatz`
                    : "Kein Trinkgeld"}
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Rabatte</span>
                  <Percent className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(revenueStats.total_discounts)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Gesamt gegeben</div>
              </div>
            </div>

            {/* Top Artikel */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="w-6 h-6" />
                Meistverkaufte Artikel
              </h2>
              {topItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Keine Daten für den ausgewählten Zeitraum
                </div>
              ) : (
                <div className="space-y-3">
                  {topItems.map((item, index) => (
                    <div
                      key={item.item_name}
                      className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-900/50 border border-blue-600 flex items-center justify-center text-blue-200 font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-white">{item.item_name}</div>
                          <div className="text-sm text-gray-400">
                            {item.quantity_sold}x verkauft
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">
                          {formatCurrency(item.revenue)}
                        </div>
                        <div className="text-xs text-gray-400">Umsatz</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kategorien */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Umsatz nach Kategorien
              </h2>
              {Object.keys(categoryStats).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Keine Daten für den ausgewählten Zeitraum
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(categoryStats)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([category, stats]) => (
                      <div
                        key={category}
                        className="p-4 bg-gray-900/50 rounded-md border border-gray-700"
                      >
                        <div className="font-medium text-white mb-2">{category}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Menge:</span>
                            <span className="text-white">{stats.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Umsatz:</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(stats.revenue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Stunden-Statistiken */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
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
                      <div className="w-full h-32 bg-gray-900/50 rounded-md border border-gray-700 relative overflow-hidden">
                        {stats.revenue > 0 && (
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-blue-600 transition-all"
                            style={{ height: `${height}%` }}
                          />
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-end p-2 z-10">
                          {stats.order_count > 0 && (
                            <>
                              <div className="text-xs font-semibold text-white">
                                {formatCurrency(stats.revenue)}
                              </div>
                              <div className="text-xs text-gray-400">{stats.order_count}</div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">{String(hour).padStart(2, "0")}:00</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <BarChart3 className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              Keine Daten verfügbar
            </h2>
            <p className="text-gray-500">Laden Sie Daten für einen Zeitraum</p>
          </div>
        )}
      </div>
    </div>
  );
}

