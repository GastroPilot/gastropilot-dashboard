"use client";

import { useQuery } from "@tanstack/react-query";
import { adminStatsApi } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, Star, Store } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminStatsApi.get(),
  });

  if (isLoading || !stats) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Gäste",
      value: stats.total_guests,
      sub: `+${stats.recent_guests_30d} (30 Tage)`,
      icon: Users,
    },
    {
      title: "Reservierungen",
      value: stats.total_reservations,
      sub: `+${stats.recent_reservations_30d} (30 Tage)`,
      icon: CalendarDays,
    },
    {
      title: "Bewertungen",
      value: stats.total_reviews,
      sub: null,
      icon: Star,
    },
    {
      title: "Restaurants",
      value: stats.total_restaurants,
      sub: null,
      icon: Store,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.sub && (
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reservations by status */}
      {Object.keys(stats.reservations_by_status).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Reservierungen nach Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.reservations_by_status).map(
                ([status, count]) => (
                  <div key={status} className="rounded-md border px-4 py-2">
                    <div className="text-xs text-muted-foreground capitalize">
                      {status}
                    </div>
                    <div className="text-xl font-bold">{count}</div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
