import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/legal";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const appRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/wallet`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/swipe`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/points`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/transfers`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/statement`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/cheatsheet`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/fee-roi`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const legalRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/security`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  return [...appRoutes, ...legalRoutes];
}
