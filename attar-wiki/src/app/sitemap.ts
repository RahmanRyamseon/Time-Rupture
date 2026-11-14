import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/data/wiki";
import { absoluteUrl } from "@/lib/site";
import { TYPE_TO_SECTION } from "@/lib/sections";

export const revalidate = 3600;

const STATIC = ["/", "/attars", "/houses", "/notes", "/regions", "/glossary", "/guides", "/finder", "/about", "/contribute"];

function entry(path: string, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path, "en"),
    lastModified,
    alternates: { languages: { "en-IN": absoluteUrl(path, "en"), "hi-IN": absoluteUrl(path, "hi") } },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = await getSitemapEntries();
  return [...STATIC.map((p) => entry(p)), ...docs.map((d) => entry(`/${TYPE_TO_SECTION[d.entity_type]}/${d.slug}`, d.updated_at))];
}
