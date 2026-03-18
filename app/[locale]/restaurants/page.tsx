"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { SearchBar } from "@/components/search-bar";
import { AllergenFilter } from "@/components/allergen-filter";
import { CuisineFilter } from "@/components/cuisine-filter";
import { PriceRangeFilter } from "@/components/price-range-filter";
import { RestaurantCard } from "@/components/restaurant-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useRestaurantSearch } from "@/lib/hooks/use-restaurants";
import { SearchX, LayoutGrid, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AllergenId } from "@/lib/utils";

const RestaurantMap = dynamic(
  () => import("@/components/restaurant-map").then((mod) => mod.RestaurantMap),
  { ssr: false, loading: () => <Skeleton className="h-[500px] w-full rounded-lg" /> }
);

function RestaurantsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get("query") || "";
  const initialAllergens = (searchParams.get("allergens")?.split(",").filter(Boolean) || []) as AllergenId[];
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialCuisine = searchParams.get("cuisine") || "";
  const initialPriceRange = Number(searchParams.get("price_range")) || null;

  const [query, setQuery] = useState(initialQuery);
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenId[]>(initialAllergens);
  const [page, setPage] = useState(initialPage);
  const [cuisine, setCuisine] = useState(initialCuisine);
  const [priceRange, setPriceRange] = useState<number | null>(initialPriceRange);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const { data, isLoading } = useRestaurantSearch({
    query: query || undefined,
    allergens: selectedAllergens.length ? selectedAllergens : undefined,
    cuisine: cuisine && cuisine !== "all" ? cuisine : undefined,
    price_range: priceRange || undefined,
    page,
    limit: 12,
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (selectedAllergens.length) params.set("allergens", selectedAllergens.join(","));
    if (cuisine && cuisine !== "all") params.set("cuisine", cuisine);
    if (priceRange) params.set("price_range", priceRange.toString());
    if (page > 1) params.set("page", page.toString());
    const qs = params.toString();
    router.replace(`/restaurants${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [query, selectedAllergens, cuisine, priceRange, page, router]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setPage(1);
  };

  const handleAllergenToggle = (id: AllergenId) => {
    setSelectedAllergens((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Restaurants finden</h1>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-md p-2 transition-colors",
              viewMode === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Rasteransicht"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={cn(
              "rounded-md p-2 transition-colors",
              viewMode === "map" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Kartenansicht"
          >
            <Map className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-8 space-y-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSearch}
        />
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Küche:</p>
            <CuisineFilter value={cuisine} onChange={(v) => { setCuisine(v); setPage(1); }} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Preisklasse:</p>
            <PriceRangeFilter value={priceRange} onChange={(v) => { setPriceRange(v); setPage(1); }} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Allergene ausschliessen:</p>
          <AllergenFilter
            selectedAllergens={selectedAllergens}
            onToggle={handleAllergenToggle}
          />
        </div>
      </div>

      {/* Results Count */}
      {data && (
        <p className="mb-4 text-sm text-muted-foreground">
          {data.total} {data.total === 1 ? "Restaurant" : "Restaurants"} gefunden
        </p>
      )}

      {/* Results */}
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
      ) : viewMode === "map" ? (
        <RestaurantMap restaurants={data?.items || []} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items?.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>

          {data && (data.items?.length ?? 0) === 0 && (
            <EmptyState
              icon={SearchX}
              title="Keine Restaurants gefunden"
              description="Versuchen Sie andere Suchbegriffe oder entfernen Sie einige Filter."
            />
          )}

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Zurück
              </Button>
              <span className="text-sm text-muted-foreground">
                Seite {page} von {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Weiter
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Skeleton className="mb-6 h-10 w-64" />
          <Skeleton className="mb-8 h-12 w-full" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-video w-full rounded-t-lg" />
                <CardContent className="space-y-3 p-6">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      }
    >
      <RestaurantsContent />
    </Suspense>
  );
}
