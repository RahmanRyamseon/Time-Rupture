import { getContent } from "@/lib/content";
import { CORS, json } from "@/lib/api";
import type { Content } from "@/lib/types";

/**
 * Read-only public API for the website and a future native app.
 * GET /api/v1/{products|houses|origins|notes|articles|taxonomy|citations}
 * Products accept the website filters (category, origin, house, occasion, season, family, concentration, gender)
 * and paging (limit ≤ 200, offset).
 */
const RESOURCES = ["products", "houses", "origins", "notes", "articles", "taxonomy", "citations"] as const;
type R = (typeof RESOURCES)[number];

export async function generateStaticParams() { return RESOURCES.map((resource) => ({ resource })); }

export async function GET(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!RESOURCES.includes(resource as R)) return json({ error: "not found" }, { status: 404 });
  const c: Content = await getContent();
  const sp = new URL(req.url).searchParams;
  if (resource === "products") {
    const f = Object.fromEntries(["category", "origin", "house", "occasion", "season", "family", "concentration", "gender"].map((k) => [k, sp.get(k) ?? ""]));
    const data = c.products.filter((p) =>
      (!f.category || p.category === f.category) && (!f.origin || p.origins.includes(f.origin)) && (!f.house || p.houseId === f.house) &&
      (!f.occasion || p.occasions.includes(f.occasion)) && (!f.season || p.seasons.includes(f.season) || p.seasons.includes("all")) &&
      (!f.family || p.family === f.family) && (!f.concentration || p.concentration === f.concentration) && (!f.gender || p.gender === f.gender));
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit")) || 50));
    const offset = Math.max(0, Number(sp.get("offset")) || 0);
    return json({ data: data.slice(offset, offset + limit), count: data.length, limit, offset, generatedAt: c.generatedAt });
  }
  const data = c[resource as Exclude<R, "products">];
  return json({ data, generatedAt: c.generatedAt });
}

export function OPTIONS() { return new Response(null, { headers: CORS }); }
