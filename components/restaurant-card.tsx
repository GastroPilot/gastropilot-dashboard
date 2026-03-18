"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, EU_ALLERGENS, type AllergenId } from "@/lib/utils";
import { MapPin, Star, Heart, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useFavoriteIds, useToggleFavorite } from "@/lib/hooks/use-favorites";
import { toast } from "sonner";
import { OpeningHours } from "@/components/opening-hours";
import type { PublicRestaurant } from "@/lib/api/restaurants";

interface RestaurantCardProps {
  restaurant: PublicRestaurant;
  className?: string;
}

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  if (rating === null) return <span className="text-sm text-muted-foreground">Keine Bewertungen</span>;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          )}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        {rating.toFixed(1)} ({count})
      </span>
    </div>
  );
}

function AllergenBadges({ allergenIds }: { allergenIds: AllergenId[] }) {
  if (!allergenIds.length) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {allergenIds.map((id) => {
        const allergen = EU_ALLERGENS.find((a) => a.id === id);
        if (!allergen) return null;
        return (
          <Badge key={id} variant="secondary" className="text-xs">
            {allergen.label}
          </Badge>
        );
      })}
    </div>
  );
}

export function RestaurantCard({ restaurant, className }: RestaurantCardProps) {
  const { isAuthenticated } = useAuth();
  const { data: favoriteIds } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = favoriteIds?.has(restaurant.id) ?? false;

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate(
      { restaurantId: restaurant.id, isFavorite },
      {
        onSuccess: () =>
          toast.success(isFavorite ? "Aus Merkliste entfernt" : "Zur Merkliste hinzugefügt"),
        onError: () => toast.error("Fehler beim Aktualisieren der Merkliste"),
      }
    );
  };

  return (
    <Link href={`/restaurants/${restaurant.slug}`}>
      <Card className={cn("relative h-full transition-shadow hover:shadow-md", className)}>
        {isAuthenticated && (
          <button
            onClick={handleToggleFavorite}
            className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 backdrop-blur-sm transition-colors hover:bg-background"
            aria-label={isFavorite ? "Aus Merkliste entfernen" : "Zur Merkliste hinzufügen"}
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                isFavorite
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground hover:text-red-500"
              )}
            />
          </button>
        )}
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          {restaurant.image_url ? (
            <Image
              src={restaurant.image_url}
              alt={restaurant.name}
              width={600}
              height={338}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{restaurant.name}</CardTitle>
            {restaurant.price_range && (
              <span className="shrink-0 text-sm text-muted-foreground">
                {"$".repeat(restaurant.price_range)}
              </span>
            )}
          </div>
          {restaurant.cuisine_type && (
            <p className="text-sm text-muted-foreground">{restaurant.cuisine_type}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <StarRating rating={restaurant.average_rating} count={restaurant.review_count} />
          {restaurant.address && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{restaurant.address}</span>
            </div>
          )}
          <OpeningHours openingHours={restaurant.opening_hours} compact />
          <AllergenBadges allergenIds={restaurant.allergen_safe} />
        </CardContent>
      </Card>
    </Link>
  );
}
