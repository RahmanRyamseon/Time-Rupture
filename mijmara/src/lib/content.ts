import "server-only";
import { cache } from "react";
import bundled from "@/generated/content.json";
import type { Article, Bi, Content, House, Locale, Note, Origin, Product } from "./types";
import { supabaseConfigured } from "./supabase/config";

/**
 * Content repository. By default the CSV-compiled dataset is used (fully static,
 * works with no database). With CONTENT_SOURCE=supabase, approved content is read
 * from the database through the export_content() RPC, which returns the same shape.
 */
export const getContent = cache(async (): Promise<Content> => {
  if (process.env.CONTENT_SOURCE === "supabase" && supabaseConfigured) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
      const { data, error } = await sb.rpc("export_content");
      if (!error && data) return data as Content;
      console.error("export_content failed, falling back to bundled data", error);
    } catch (e) {
      console.error("Supabase content load failed, falling back to bundled data", e);
    }
  }
  return bundled as unknown as Content;
});

const decode = (s: string) => {
  try { return decodeURIComponent(s).normalize("NFC"); } catch { return s; }
};
const bySlug = <T extends { slug: Bi }>(items: T[], slug: string): T | undefined => {
  const s = decode(slug);
  return items.find((i) => i.slug.ar.normalize("NFC") === s || i.slug.en === s);
};

export async function getProduct(slug: string): Promise<Product | undefined> { return bySlug((await getContent()).products, slug); }
export async function getHouse(slug: string): Promise<House | undefined> { return bySlug((await getContent()).houses, slug); }
export async function getOrigin(slug: string): Promise<Origin | undefined> { return bySlug((await getContent()).origins, slug); }
export async function getNote(slug: string): Promise<Note | undefined> { return bySlug((await getContent()).notes, slug); }
export async function getArticle(kind: Article["kind"], slug: string): Promise<Article | undefined> {
  return bySlug((await getContent()).articles.filter((a) => a.kind === kind), slug);
}

export function taxName(c: Content, type: string, id: string, locale: Locale): string {
  return c.taxonomy[type]?.find((t) => t.id === id)?.name[locale] ?? id;
}

/** Products sharing category, origin and notes. Purely mechanical — never a claim of equivalence. */
export function similarProducts(c: Content, p: Product, limit = 4): Product[] {
  const notesOf = (x: Product) => new Set([...x.notes.top, ...x.notes.heart, ...x.notes.base].map((n) => n.note));
  const mine = notesOf(p);
  return c.products
    .filter((o) => o.id !== p.id)
    .map((o) => {
      let s = 0;
      if (o.category === p.category) s += 3;
      s += o.origins.filter((x) => p.origins.includes(x)).length * 2;
      for (const n of notesOf(o)) if (mine.has(n)) s += 1;
      return { o, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.o);
}

/** All slug params for a type in both locales (for generateStaticParams). */
export function staticSlugParams(items: { slug: Bi }[]) {
  return items.flatMap((i) => [
    { locale: "ar", slug: i.slug.ar },
    { locale: "en", slug: i.slug.en },
  ]);
}
