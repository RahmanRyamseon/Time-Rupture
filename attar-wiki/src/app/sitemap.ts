import type { MetadataRoute } from "next";
import {
  getComparisonIndex,
  getProductRows,
  getSitemapEntries,
} from "@/lib/data/wiki";
import { brandPairs } from "@/lib/brands";
import { BUDGETS, budgetSlug } from "@/lib/compare";
import { absoluteUrl } from "@/lib/site";
import { TYPE_TO_SECTION } from "@/lib/sections";

export const revalidate = 3600;

const STATIC = [
  "/",
  "/compared",
  "/attars",
  "/houses",
  "/notes",
  "/regions",
  "/glossary",
  "/guides",
  "/finder",
  "/about",
  "/contribute",
];

function entry(
  path: string,
  lastModified?: string,
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path, "en"),
    lastModified,
    alternates: {
      languages: {
        "en-IN": absoluteUrl(path, "en"),
        "hi-IN": absoluteUrl(path, "hi"),
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [docs, comparisons, products] = await Promise.all([
    getSitemapEntries(),
    getComparisonIndex(),
    getProductRows(),
  ]);
  return [
    ...STATIC.map((p) => entry(p)),
    ...BUDGETS.map((b) => entry(`/best/${budgetSlug(b)}`)),
    ...comparisons.map((c) => entry(`/compared/${c.slug}`)),
    ...brandPairs(products).map((p) => entry(`/compared/brands/${p.slug}`)),
    ...docs.map((d) =>
      entry(`/${TYPE_TO_SECTION[d.entity_type]}/${d.slug}`, d.updated_at),
    ),
  ];
}
