"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AllergenFilter } from "@/components/allergen-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantCard } from "@/components/restaurant-card";
import { useRestaurantSearch } from "@/lib/hooks/use-restaurants";
import type { AllergenId } from "@/lib/utils";
import { Search, MapPin, ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<AllergenId[]>([]);

  const { data: popularRestaurants, isLoading } = useRestaurantSearch({
    limit: 6,
    page: 1,
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (location) params.set("location", location);
    if (selectedAllergens.length)
      params.set("allergens", selectedAllergens.join(","));
    router.push(`/restaurants?${params.toString()}`);
  };

  const handleAllergenToggle = (id: AllergenId) => {
    setSelectedAllergens((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div>
      {/* Hero – Doctolib-style centered search */}
      <section className="px-4 pb-20 pt-20 sm:pb-28 sm:pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[clamp(2.25rem,5.5vw,3.75rem)] font-extrabold leading-[0.95] tracking-[-2px]">
            Dein Restaurant
            <br />
            <span className="text-primary">finden & reservieren.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[16px] font-normal leading-relaxed text-muted-foreground">
            Suche nach Küche, Standort oder Allergenen – und reserviere deinen Tisch direkt online.
          </p>

          {/* Search bar */}
          <div className="mx-auto mt-10 max-w-lg">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b px-4">
                <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Restaurant oder Küche"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-[52px] w-full bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="flex items-center gap-3 px-4">
                <MapPin className="h-[18px] w-[18px] shrink-0 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Ort oder PLZ"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-[52px] w-full bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="mt-4 w-full rounded-full bg-foreground py-3.5 text-[15px] font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              Restaurant suchen
            </button>
          </div>

          {/* Allergen filter */}
          <div className="mt-6">
            <AllergenFilter
              selectedAllergens={selectedAllergens}
              onToggle={handleAllergenToggle}
              className="justify-center"
            />
          </div>
        </div>
      </section>

      {/* Restaurants */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground/60">Entdecken</p>
              <h2 className="mt-1 text-[24px] font-bold tracking-tight">
                Beliebte Restaurants
              </h2>
            </div>
            <Link
              href="/restaurants"
              className="hidden items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              Alle anzeigen
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border">
                  <Skeleton className="aspect-[16/10] w-full" />
                  <div className="space-y-2.5 p-5">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(popularRestaurants?.items ?? []).map((restaurant: any) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
              {(!popularRestaurants || (popularRestaurants.items ?? []).length === 0) && (
                <p className="col-span-full py-16 text-center text-[15px] text-muted-foreground">
                  Noch keine Restaurants verfügbar.
                </p>
              )}
            </div>
          )}
          <Link
            href="/restaurants"
            className="mt-8 flex items-center justify-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:hidden"
          >
            Alle Restaurants anzeigen
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* For restaurants – CTA card */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex flex-col gap-8 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[2px] text-primary">
                  Für Restaurantbetreiber
                </p>
                <h2 className="mt-2 text-[22px] font-bold tracking-tight">
                  GastroPilot für Ihr Restaurant
                </h2>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                  Reservierungen, Bestellungen, Tischpläne und Kartenzahlung – alles in einer Software.
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <Link
                  href="/fuer-restaurants"
                  className="rounded-full bg-foreground px-6 py-2.5 text-[14px] font-semibold text-background transition-colors hover:bg-foreground/90"
                >
                  Mehr erfahren
                </Link>
                <a
                  href="https://app.gastropilot.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border px-6 py-2.5 text-[14px] font-semibold transition-colors hover:bg-accent"
                >
                  Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
