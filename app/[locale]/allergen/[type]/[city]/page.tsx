import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";

const ALLERGEN_LABELS: Record<string, { de: string; en: string }> = {
  gluten: { de: "Glutenfrei", en: "Gluten-Free" },
  dairy: { de: "Laktosefrei", en: "Dairy-Free" },
  nuts: { de: "Nussfrei", en: "Nut-Free" },
  eggs: { de: "Eifrei", en: "Egg-Free" },
  soy: { de: "Sojafrei", en: "Soy-Free" },
  fish: { de: "Fischfrei", en: "Fish-Free" },
  shellfish: { de: "Schalentierfrei", en: "Shellfish-Free" },
  celery: { de: "Selleriefrei", en: "Celery-Free" },
  mustard: { de: "Senffrei", en: "Mustard-Free" },
  sesame: { de: "Sesamfrei", en: "Sesame-Free" },
  lupin: { de: "Lupinenfrei", en: "Lupin-Free" },
  molluscs: { de: "Weichtierfrei", en: "Mollusc-Free" },
  peanuts: { de: "Erdnussfrei", en: "Peanut-Free" },
  sulphites: { de: "Sulfitfrei", en: "Sulphite-Free" },
};

const TOP_CITIES = [
  "berlin", "hamburg", "muenchen", "koeln", "frankfurt",
  "stuttgart", "duesseldorf", "leipzig", "dortmund", "essen",
  "bremen", "dresden", "hannover", "nuernberg", "duisburg",
];

const CITY_NAMES: Record<string, string> = {
  berlin: "Berlin",
  hamburg: "Hamburg",
  muenchen: "München",
  koeln: "Köln",
  frankfurt: "Frankfurt",
  stuttgart: "Stuttgart",
  duesseldorf: "Düsseldorf",
  leipzig: "Leipzig",
  dortmund: "Dortmund",
  essen: "Essen",
  bremen: "Bremen",
  dresden: "Dresden",
  hannover: "Hannover",
  nuernberg: "Nürnberg",
  duisburg: "Duisburg",
};

interface PageProps {
  params: Promise<{ locale: string; type: string; city: string }>;
}

export async function generateStaticParams() {
  const params: { locale: string; type: string; city: string }[] = [];
  for (const type of Object.keys(ALLERGEN_LABELS)) {
    for (const city of TOP_CITIES) {
      params.push({ locale: "de", type, city });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, city } = await params;
  const allergen = ALLERGEN_LABELS[type];
  const cityName = CITY_NAMES[city];
  if (!allergen || !cityName) return {};

  const title = `${allergen.de} Restaurants in ${cityName} | GastroPilot`;
  const description = `Finden Sie ${allergen.de.toLowerCase()} Restaurants in ${cityName}. Sicher essen mit dem SafePlate Allergen-System von GastroPilot.`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

async function fetchRestaurants(type: string, city: string) {
  const baseUrl =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:80";
  const prefix = process.env.NEXT_PUBLIC_API_PREFIX || "v1";

  try {
    const url = `${baseUrl}/${prefix}/public/restaurants/?allergens=${type}&query=${city}&limit=50`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export default async function AllergenCityPage({ params }: PageProps) {
  const { type, city } = await params;
  const allergen = ALLERGEN_LABELS[type];
  const cityName = CITY_NAMES[city];

  if (!allergen || !cityName) notFound();

  const restaurants = await fetchRestaurants(type, city);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${allergen.de} Restaurants in ${cityName}`,
    itemListElement: restaurants.map((r: any, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Restaurant",
        name: r.name,
        address: r.address,
        url: `https://portal.gastropilot.de/restaurants/${r.slug}`,
        ...(r.average_rating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: r.average_rating,
                reviewCount: r.review_count || 1,
              },
            }
          : {}),
      },
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Script
        id="allergen-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(jsonLd)}
      </Script>

      <h1 className="text-3xl font-bold mb-2">
        {allergen.de} Restaurants in {cityName}
      </h1>
      <p className="text-muted-foreground mb-8">
        Entdecken Sie {restaurants.length} Restaurant
        {restaurants.length !== 1 ? "s" : ""} mit{" "}
        {allergen.de.toLowerCase()}en Optionen in {cityName}. Verifiziert durch
        das GastroPilot SafePlate Allergen-System.
      </p>

      {restaurants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Noch keine {allergen.de.toLowerCase()}en Restaurants in {cityName}{" "}
            registriert.
          </p>
          <Link
            href="/restaurants"
            className="text-primary hover:underline mt-4 inline-block"
          >
            Alle Restaurants anzeigen
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {restaurants.map((r: any) => (
            <Link
              key={r.id}
              href={`/restaurants/${r.slug}`}
              className="block rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <h2 className="text-lg font-semibold">{r.name}</h2>
              {r.cuisine_type && (
                <p className="text-sm text-primary">{r.cuisine_type}</p>
              )}
              {r.address && (
                <p className="text-sm text-muted-foreground mt-1">
                  {r.address}
                </p>
              )}
              {r.average_rating != null && (
                <p className="text-sm mt-2">
                  <span className="text-yellow-500">&#9733;</span>{" "}
                  {r.average_rating.toFixed(1)} ({r.review_count} Bewertungen)
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Internal links for other cities */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-lg font-semibold mb-4">
          {allergen.de} in anderen Städten
        </h2>
        <div className="flex flex-wrap gap-2">
          {TOP_CITIES.filter((c) => c !== city).map((c) => (
            <Link
              key={c}
              href={`/allergen/${type}/${c}`}
              className="rounded-full border px-3 py-1 text-sm hover:bg-accent"
            >
              {CITY_NAMES[c]}
            </Link>
          ))}
        </div>
      </div>

      {/* Internal links for other allergens */}
      <div className="mt-8 border-t pt-8">
        <h2 className="text-lg font-semibold mb-4">
          Weitere Allergen-Filter in {cityName}
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ALLERGEN_LABELS)
            .filter(([key]) => key !== type)
            .map(([key, label]) => (
              <Link
                key={key}
                href={`/allergen/${key}/${city}`}
                className="rounded-full border px-3 py-1 text-sm hover:bg-accent"
              >
                {label.de}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
