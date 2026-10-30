import type { MetadataRoute } from "next";
import { CASES } from "@/data/cases";
import { CATEGORIES } from "@/data/categories";
import { SITE_URL, UPSTREAM } from "@/lib/site";
import { TAG_ORDER, tagSlug } from "@/lib/tags";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/browse/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/by-app/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/evidence/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/new/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/resources/`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/legal/`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}/`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const tagRoutes: MetadataRoute.Sitemap = TAG_ORDER.map((t) => ({
    url: `${SITE_URL}/tag/${tagSlug(t)}/`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const caseRoutes: MetadataRoute.Sitemap = CASES.map((c) => ({
    url: `${SITE_URL}/case/${c.slug}/`,
    lastModified: UPSTREAM.snapshot,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...tagRoutes, ...caseRoutes];
}
