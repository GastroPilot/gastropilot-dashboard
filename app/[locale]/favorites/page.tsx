"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { RestaurantCard } from "@/components/restaurant-card";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { Heart } from "lucide-react";
import type { PublicRestaurant } from "@/lib/api/restaurants";

export default function FavoritesPage() {
  const { data: favorites, isLoading } = useFavorites();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Meine Merkliste</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-video w-full rounded-t-lg" />
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !favorites?.length ? (
        <EmptyState
          icon={Heart}
          title="Noch keine Favoriten"
          description="Speichern Sie Ihre Lieblingsrestaurants, um sie hier schnell wiederzufinden."
          action={{ label: "Restaurants entdecken", href: "/restaurants" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => (
            <RestaurantCard
              key={fav.id}
              restaurant={
                {
                  ...fav,
                  phone: null,
                  email: null,
                  price_range: null,
                  allergen_safe: [],
                  opening_hours: null,
                  latitude: null,
                  longitude: null,
                  public_booking_enabled: true,
                  booking_max_party_size: 10,
                } as PublicRestaurant
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
