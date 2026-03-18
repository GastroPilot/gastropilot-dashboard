import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://portal.gastropilot.de";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/restaurants`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // Fetch public restaurants for individual pages
  try {
    const baseUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:80";
    const prefix = process.env.NEXT_PUBLIC_API_PREFIX || "v1";
    const response = await fetch(`${baseUrl}/${prefix}/public/restaurants/?limit=1000`, {
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      const restaurants = data.items || [];

      for (const restaurant of restaurants) {
        entries.push({
          url: `${SITE_URL}/restaurants/${restaurant.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Silently fail - static pages are still included
  }

  // Allergen landing pages
  const allergenTypes = [
    "gluten", "dairy", "nuts", "eggs", "soy", "fish", "shellfish",
    "celery", "mustard", "sesame", "lupin", "molluscs", "peanuts", "sulphites",
  ];
  const topCities = [
    "berlin", "hamburg", "muenchen", "koeln", "frankfurt",
    "stuttgart", "duesseldorf", "leipzig", "dortmund", "essen",
  ];
  for (const type of allergenTypes) {
    for (const city of topCities) {
      entries.push({
        url: `${SITE_URL}/de/allergen/${type}/${city}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
