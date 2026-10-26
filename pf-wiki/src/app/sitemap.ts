import type { MetadataRoute } from "next";
import { PROBLEMS } from "@/data/problems";
import { CATEGORIES } from "@/data/categories";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/browse/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/official-links/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy/`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cookies/`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms/`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/security/`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}/`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const problemRoutes: MetadataRoute.Sitemap = PROBLEMS.map((p) => ({
    url: `${SITE_URL}/problem/${p.slug}/`,
    lastModified: p.lastVerified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...problemRoutes];
}
