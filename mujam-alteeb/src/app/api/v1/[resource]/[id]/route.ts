import { getContent } from "@/lib/content";
import { json } from "@/lib/api";

/** GET /api/v1/{products|houses|origins|notes|articles}/{id or slug} — includes resolved citations. */
export async function GET(_req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const c = await getContent();
  const lists: Record<string, { id: string; slug: { ar: string; en: string } }[]> = { products: c.products, houses: c.houses, origins: c.origins, notes: c.notes, articles: c.articles };
  const list = lists[resource];
  if (!list) return json({ error: "not found" }, { status: 404 });
  const key = decodeURIComponent(id).normalize("NFC");
  const item = list.find((x) => x.id === key || x.slug.ar.normalize("NFC") === key || x.slug.en === key) as (typeof list)[number] & { citations?: Record<string, string[]> | string[] };
  if (!item) return json({ error: "not found" }, { status: 404 });
  const ids = Array.isArray(item.citations) ? item.citations : Object.values(item.citations ?? {}).flat();
  return json({ data: item, citations: [...new Set(ids)].map((cid) => c.citations[cid]).filter(Boolean) });
}
