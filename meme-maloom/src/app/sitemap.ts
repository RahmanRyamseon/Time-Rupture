import type { MetadataRoute } from "next";
import { memes } from "@/lib/data";

const siteUrl = "https://www.mememaloom.in";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/explore",
    "/languages",
    "/regions",
    "/categories",
    "/trending",
    "/submit",
    "/about",
    "/community-guidelines",
    "/copyright",
    "/privacy",
    "/contact",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));

  const memeRoutes = memes.map((m) => ({
    url: `${siteUrl}/meme/${m.slug}`,
    lastModified: m.originDate,
  }));

  return [...staticRoutes, ...memeRoutes];
}
