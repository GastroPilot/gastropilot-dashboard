"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingWidget } from "@/components/booking-widget";
import { OpeningHours, isOpenNow } from "@/components/opening-hours";
import { useAuth } from "@/lib/hooks/use-auth";
import { useAdminAuth } from "@/lib/hooks/use-admin-auth";
import { useFavoriteIds, useToggleFavorite } from "@/lib/hooks/use-favorites";
import { toast } from "sonner";
import { adminReviewsApi } from "@/lib/api/admin";
import { reviewsApi } from "@/lib/api/restaurants";
import { EU_ALLERGENS, cn, type AllergenId } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import {
  MapPin,
  Phone,
  Clock,
  Star,
  Mail,
  Trash2,
  BadgeCheck,
  Send,
  ExternalLink,
  MessageSquare,
  Heart,
  UtensilsCrossed,
} from "lucide-react";
import type {
  PublicRestaurant,
  MenuCategory,
  RestaurantReview,
  PaginatedResponse,
} from "@/lib/api/restaurants";

interface Props {
  restaurant: PublicRestaurant;
  menu: MenuCategory[];
  reviews: PaginatedResponse<RestaurantReview>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                starValue <= (hover || value)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function AllergenIcon({ id }: { id: AllergenId }) {
  const allergen = EU_ALLERGENS.find((a) => a.id === id);
  if (!allergen) return null;
  return (
    <span
      title={allergen.label}
      className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive"
    >
      {allergen.label}
    </span>
  );
}

export function RestaurantDetailClient({
  restaurant,
  menu,
  reviews: initialReviews,
}: Props) {
  const { isAuthenticated, user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { data: favoriteIds } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = favoriteIds?.has(restaurant.id) ?? false;
  const [reviews, setReviews] = useState(initialReviews);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Review Form State
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Review Sort/Filter State
  const [sortBy, setSortBy] = useState<"newest" | "best" | "worst">("newest");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filteredReviews = useMemo(() => {
    let items = [...reviews.items];
    if (verifiedOnly) {
      items = items.filter((r) => r.is_verified);
    }
    items.sort((a, b) => {
      switch (sortBy) {
        case "best":
          return b.rating - a.rating;
        case "worst":
          return a.rating - b.rating;
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return items;
  }, [reviews.items, sortBy, verifiedOnly]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Bewertung wirklich löschen?")) return;
    setDeletingId(reviewId);
    try {
      await adminReviewsApi.delete(reviewId);
      setReviews((prev) => ({
        ...prev,
        items: prev.items.filter((r) => r.id !== reviewId),
        total: prev.total - 1,
      }));
      toast.success("Bewertung gelöscht");
    } catch {
      toast.error("Fehler beim Löschen der Bewertung");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewRating === 0) {
      toast.error("Bitte wählen Sie eine Bewertung");
      return;
    }

    setReviewSubmitting(true);
    try {
      const newReview = await reviewsApi.create(restaurant.slug, {
        rating: reviewRating,
        title: reviewTitle || undefined,
        text: reviewText || undefined,
      });
      setReviews((prev) => ({
        ...prev,
        items: [
          {
            ...newReview,
            guest_name: newReview.author_name,
            comment: newReview.text,
          },
          ...prev.items,
        ],
        total: prev.total + 1,
      }));
      setReviewRating(0);
      setReviewTitle("");
      setReviewText("");
      setReviewSuccess(true);
      toast.success("Vielen Dank für Ihre Bewertung!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Fehler beim Senden der Bewertung";
      if (message.includes("already reviewed")) {
        toast.error("Sie haben dieses Restaurant bereits bewertet");
      } else {
        toast.error(message);
      }
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-6 aspect-[3/1] w-full overflow-hidden rounded-xl">
          {restaurant.image_url ? (
            <Image
              src={restaurant.image_url}
              alt={restaurant.name}
              width={1200}
              height={400}
              className="h-full w-full object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <UtensilsCrossed className="h-20 w-20 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{restaurant.name}</h1>
              {isAuthenticated && (
                <button
                  onClick={() =>
                    toggleFavorite.mutate(
                      { restaurantId: restaurant.id, isFavorite },
                      {
                        onSuccess: () =>
                          toast.success(
                            isFavorite
                              ? "Aus Merkliste entfernt"
                              : "Zur Merkliste hinzugefügt"
                          ),
                        onError: () =>
                          toast.error("Fehler beim Aktualisieren der Merkliste"),
                      }
                    )
                  }
                  className="rounded-full p-1.5 transition-colors hover:bg-accent"
                  aria-label={isFavorite ? "Aus Merkliste entfernen" : "Zur Merkliste"}
                >
                  <Heart
                    className={cn(
                      "h-6 w-6 transition-colors",
                      isFavorite
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground hover:text-red-500"
                    )}
                  />
                </button>
              )}
              <OpeningHours openingHours={restaurant.opening_hours} compact />
            </div>
            {restaurant.cuisine_type && (
              <p className="text-lg text-muted-foreground">
                {restaurant.cuisine_type}
              </p>
            )}
            {restaurant.description && (
              <p className="max-w-2xl text-muted-foreground">
                {restaurant.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {restaurant.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {restaurant.address}
                </span>
              )}
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Phone className="h-4 w-4" />
                  {restaurant.phone}
                </a>
              )}
              {restaurant.email && (
                <a
                  href={`mailto:${restaurant.email}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                  {restaurant.email}
                </a>
              )}
            </div>
            {restaurant.average_rating !== null && (
              <div className="flex items-center gap-2">
                <StarRating rating={restaurant.average_rating} />
                <span className="text-sm text-muted-foreground">
                  {restaurant.average_rating.toFixed(1)} ({restaurant.review_count}{" "}
                  Bewertungen)
                </span>
              </div>
            )}
            {restaurant.allergen_safe.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium">Allergensicher:</span>
                {restaurant.allergen_safe.map((id) => {
                  const allergen = EU_ALLERGENS.find((a) => a.id === id);
                  return allergen ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {allergen.label}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {restaurant.price_range && (
            <span className="text-2xl font-bold text-muted-foreground">
              {"$".repeat(restaurant.price_range)}
            </span>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="menu">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="menu">Speisekarte</TabsTrigger>
              <TabsTrigger value="reviews">Bewertungen</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            {/* Menu Tab */}
            <TabsContent value="menu">
              {menu.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Die Speisekarte ist derzeit nicht verfügbar.
                </p>
              ) : (
                <div className="space-y-8">
                  {menu.map((category) => (
                    <div key={category.name}>
                      <h3 className="mb-4 text-xl font-semibold">
                        {category.name}
                      </h3>
                      <div className="space-y-3">
                        {category.items.map((item) => {
                          const guestAllergens = user?.allergen_ids || [];
                          const unsafeAllergens = guestAllergens.length > 0
                            ? item.allergen_ids.filter((a) => guestAllergens.includes(a))
                            : [];
                          const isUnsafe = unsafeAllergens.length > 0;
                          return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-start justify-between gap-4 rounded-lg border p-4 relative",
                              !item.is_available && "opacity-50",
                              isUnsafe && "opacity-40 grayscale"
                            )}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                {!item.is_available && (
                                  <Badge variant="secondary" className="text-xs">
                                    Nicht verfügbar
                                  </Badge>
                                )}
                                {isUnsafe && (
                                  <Badge variant="destructive" className="text-xs">
                                    Enthält: {unsafeAllergens.map((a) =>
                                      EU_ALLERGENS.find((e) => e.id === a)?.label || a
                                    ).join(", ")}
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                              {item.allergen_ids.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.allergen_ids.map((id) => (
                                    <AllergenIcon key={id} id={id} />
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 font-semibold">
                              {item.price.toFixed(2).replace(".", ",")} &euro;
                            </span>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <div className="space-y-6">
                {/* Review Form */}
                {isAuthenticated && !reviewSuccess && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-3 text-lg font-semibold">
                      Bewertung schreiben
                    </h3>
                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      <div className="space-y-1">
                        <Label>Bewertung</Label>
                        <StarRatingInput
                          value={reviewRating}
                          onChange={setReviewRating}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="reviewTitle">Titel (optional)</Label>
                        <Input
                          id="reviewTitle"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          placeholder="z.B. Tolles Essen!"
                          maxLength={200}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="reviewText">Kommentar (optional)</Label>
                        <textarea
                          id="reviewText"
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                          placeholder="Erzählen Sie von Ihrem Besuch..."
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={reviewSubmitting || reviewRating === 0}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {reviewSubmitting
                          ? "Wird gesendet..."
                          : "Bewertung senden"}
                      </Button>
                    </form>
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                    <a
                      href="/auth/login"
                      className="font-medium text-primary hover:underline"
                    >
                      Melden Sie sich an
                    </a>
                    , um eine Bewertung abzugeben.
                  </div>
                )}

                {/* Sort/Filter Controls */}
                {reviews.items.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      value={sortBy}
                      onValueChange={(v) => setSortBy(v as typeof sortBy)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Neueste zuerst</SelectItem>
                        <SelectItem value="best">Beste zuerst</SelectItem>
                        <SelectItem value="worst">Schlechteste zuerst</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                        verifiedOnly
                          ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400"
                          : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Nur verifiziert
                    </button>
                  </div>
                )}

                {/* Review List */}
                {filteredReviews.length === 0 && !reviewSuccess ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="Noch keine Bewertungen"
                    description={
                      verifiedOnly
                        ? "Keine verifizierten Bewertungen vorhanden."
                        : "Seien Sie der Erste, der dieses Restaurant bewertet."
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredReviews.map((review) => (
                      <div key={review.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {review.author_name || review.guest_name}
                            </span>
                            {review.is_verified && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                              >
                                <BadgeCheck className="h-3 w-3" />
                                Verifizierter Besuch
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString(
                                "de-DE"
                              )}
                            </span>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                disabled={deletingId === review.id}
                                onClick={() => handleDeleteReview(review.id)}
                                title="Bewertung löschen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <StarRating rating={review.rating} />
                        {review.title && (
                          <p className="mt-1 font-medium">{review.title}</p>
                        )}
                        {(review.text || review.comment) && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {review.text || review.comment}
                          </p>
                        )}
                        {review.staff_reply && (
                          <div className="mt-3 border-l-2 border-primary/30 pl-3">
                            <p className="text-xs font-medium text-primary">
                              Antwort vom Restaurant
                              {review.staff_reply_at && (
                                <span className="ml-1 font-normal text-muted-foreground">
                                  ({new Date(review.staff_reply_at).toLocaleDateString("de-DE")})
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {review.staff_reply}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Info Tab */}
            <TabsContent value="info">
              <div className="space-y-6">
                {restaurant.opening_hours && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <Clock className="h-4 w-4" />
                      Öffnungszeiten
                    </h3>
                    <OpeningHours openingHours={restaurant.opening_hours} />
                  </div>
                )}

                {restaurant.address && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold">
                      <MapPin className="h-4 w-4" />
                      Adresse
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {restaurant.address}
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Auf Google Maps öffnen
                    </a>
                  </div>
                )}

                {restaurant.phone && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold">
                      <Phone className="h-4 w-4" />
                      Telefon
                    </h3>
                    <a
                      href={`tel:${restaurant.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {restaurant.phone}
                    </a>
                  </div>
                )}

                {restaurant.email && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold">
                      <Mail className="h-4 w-4" />
                      E-Mail
                    </h3>
                    <a
                      href={`mailto:${restaurant.email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {restaurant.email}
                    </a>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Booking Widget */}
        <div className="lg:sticky lg:top-24">
          {restaurant.public_booking_enabled ? (
            <BookingWidget
              slug={restaurant.slug}
              maxPartySize={restaurant.booking_max_party_size}
            />
          ) : (
            <div className="rounded-lg border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Online-Reservierung ist für dieses Restaurant derzeit nicht
                verfügbar.
              </p>
              {restaurant.phone && (
                <p className="mt-2 text-sm">
                  Bitte rufen Sie an:{" "}
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="text-primary hover:underline"
                  >
                    {restaurant.phone}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
