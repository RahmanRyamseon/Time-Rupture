import { getAttar, getGlossaryEntry, getGuide, getHouse, getNote, getRegion } from "@/lib/data/wiki";
import { apiError, json, PUBLIC_CACHE } from "@/lib/api/http";
import { isSection } from "@/lib/sections";

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/entities/[section]/[slug]">) {
  const { section, slug } = await ctx.params;
  if (!isSection(section)) return apiError(404, "Unknown section");
  const loaders = {
    attars: getAttar,
    houses: getHouse,
    notes: getNote,
    regions: getRegion,
    glossary: getGlossaryEntry,
    guides: getGuide,
  } as const;
  const data = await loaders[section](slug);
  if (!data) return apiError(404, "Not found");
  return json(data, { cache: PUBLIC_CACHE });
}
