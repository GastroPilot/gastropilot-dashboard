import { Metadata } from "next";
import { publicRestaurantsApi } from "@/lib/api/restaurants";
import { RestaurantDetailClient } from "./restaurant-detail-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const restaurant = await publicRestaurantsApi.getBySlug(slug);
    return {
      title: restaurant.name,
      description: restaurant.description || `${restaurant.name} - Speisekarte, Bewertungen und Online-Reservierung auf GastroPilot.`,
      openGraph: {
        title: restaurant.name,
        description: restaurant.description || undefined,
        images: restaurant.image_url ? [restaurant.image_url] : undefined,
      },
      other: {
        "script:ld+json": JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Restaurant",
          name: restaurant.name,
          description: restaurant.description,
          address: restaurant.address
            ? { "@type": "PostalAddress", streetAddress: restaurant.address }
            : undefined,
          telephone: restaurant.phone,
          servesCuisine: restaurant.cuisine_type,
          priceRange: restaurant.price_range ? "$".repeat(restaurant.price_range) : undefined,
          aggregateRating: restaurant.average_rating
            ? {
                "@type": "AggregateRating",
                ratingValue: restaurant.average_rating,
                reviewCount: restaurant.review_count,
              }
            : undefined,
          image: restaurant.image_url,
          url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://portal.gastropilot.de"}/restaurants/${restaurant.slug}`,
        }),
      },
    };
  } catch {
    return {
      title: "Restaurant nicht gefunden",
    };
  }
}

export default async function RestaurantDetailPage({ params }: Props) {
  const { slug } = await params;

  let restaurant;
  let menu;
  let reviews;

  try {
    [restaurant, menu, reviews] = await Promise.all([
      publicRestaurantsApi.getBySlug(slug),
      publicRestaurantsApi.getMenu(slug),
      publicRestaurantsApi.getReviews(slug),
    ]);
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Restaurant nicht gefunden</h1>
        <p className="mt-2 text-muted-foreground">
          Das gesuchte Restaurant existiert nicht oder ist derzeit nicht verfügbar.
        </p>
      </div>
    );
  }

  return (
    <RestaurantDetailClient
      restaurant={restaurant}
      menu={menu}
      reviews={reviews}
    />
  );
}
