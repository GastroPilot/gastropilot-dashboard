import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profile/", "/reservations/", "/auth/"],
    },
    sitemap: "https://portal.gastropilot.de/sitemap.xml",
  };
}
