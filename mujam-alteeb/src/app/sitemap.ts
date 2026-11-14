import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content";
import { absolute, ENTITY_ROUTES, href } from "@/lib/paths";
import type { AppPathname } from "@/i18n/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const c = await getContent();
  const lastModified = c.generatedAt;
  const entry = (ar: string, en: string, priority = 0.6): MetadataRoute.Sitemap => [ar, en].map((u) => ({
    url: absolute(u), lastModified, priority, alternates: { languages: { ar: absolute(ar), en: absolute(en) } },
  }));
  const fixed: AppPathname[] = ["/", "/products", "/houses", "/oud-origins", "/notes", "/culture", "/guides", "/matcher", "/about", "/contributing", "/citation-policy", "/image-policy", "/privacy", "/terms", "/methodology"];
  const out: MetadataRoute.Sitemap = fixed.flatMap((r) => entry(href("ar", r), href("en", r), r === "/" ? 1 : 0.7));
  for (const cat of c.taxonomy.category ?? []) out.push(...entry(href("ar", "/category/[slug]", { slug: cat.id }), href("en", "/category/[slug]", { slug: cat.id })));
  const add = (route: (typeof ENTITY_ROUTES)[keyof typeof ENTITY_ROUTES], items: { slug: { ar: string; en: string } }[], p = 0.8) => {
    for (const i of items) out.push(...entry(href("ar", route, { slug: i.slug.ar }), href("en", route, { slug: i.slug.en }), p));
  };
  add(ENTITY_ROUTES.product, c.products);
  add(ENTITY_ROUTES.house, c.houses);
  add(ENTITY_ROUTES.origin, c.origins);
  add(ENTITY_ROUTES.note, c.notes, 0.6);
  add(ENTITY_ROUTES.culture, c.articles.filter((a) => a.kind === "culture"));
  add(ENTITY_ROUTES.guide, c.articles.filter((a) => a.kind === "guide"));
  return out;
}
