import type { MetadataRoute } from "next";
import { opportunities } from "@/lib/data/opportunities";
import { articles } from "@/lib/data/articles";
import { INDIAN_STATES } from "@/lib/data/states";

const BASE_URL = "https://edurozgar.example.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/scholarships",
    "/jobs",
    "/admissions",
    "/minority-opportunities",
    "/states",
    "/calendar",
    "/articles",
    "/dashboard",
    "/disclaimer",
    "/about",
    "/privacy",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.8,
  }));

  const opportunityRoutes: MetadataRoute.Sitemap = opportunities.map((o) => ({
    url: `${BASE_URL}/opportunity/${o.id}`,
    lastModified: new Date(o.updated_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE_URL}/articles/${a.slug}`,
    lastModified: new Date(a.published_date),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const stateRoutes: MetadataRoute.Sitemap = INDIAN_STATES.map((s) => ({
    url: `${BASE_URL}/states/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...opportunityRoutes, ...articleRoutes, ...stateRoutes];
}
