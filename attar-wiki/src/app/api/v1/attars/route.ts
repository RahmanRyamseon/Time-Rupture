import type { NextRequest } from "next/server";
import { browseAttars, type BrowseFilters } from "@/lib/data/wiki";
import { json, PUBLIC_CACHE } from "@/lib/api/http";

/** GET /api/v1/attars?family=&type=&note=&house=&region=&weather=&longevity=&priceMin=&priceMax=&sort=&page=&pageSize= */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const num = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined);
  const weather = p.get("weather");
  const filters: BrowseFilters = {
    family: p.get("family") ?? undefined,
    type: p.get("type") ?? undefined,
    note: p.get("note") ?? undefined,
    house: p.get("house") ?? undefined,
    region: p.get("region") ?? undefined,
    weather: weather === "heat" || weather === "humidity" || weather === "winter" ? weather : undefined,
    longevity: num("longevity"),
    priceMin: num("priceMin"),
    priceMax: num("priceMax"),
    sort: (["name", "updated", "longevity", "weather", "price"] as const).find((s) => s === p.get("sort")),
    page: num("page"),
    pageSize: num("pageSize"),
  };
  const { rows, total } = await browseAttars(filters);
  return json({ total, page: filters.page ?? 1, items: rows.map(({ total_count: _t, ...r }) => r) }, { cache: PUBLIC_CACHE });
}
