import { getEntityRow, getRevisions } from "@/lib/data/wiki";
import { apiError, json } from "@/lib/api/http";
import { isSection, SECTION_DEFS } from "@/lib/sections";

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/entities/[section]/[slug]/revisions">) {
  const { section, slug } = await ctx.params;
  if (!isSection(section)) return apiError(404, "Unknown section");
  const row = await getEntityRow(section, slug);
  if (!row) return apiError(404, "Not found");
  const revisions = await getRevisions(SECTION_DEFS[section].type, row.id as string);
  return json({ revisions: revisions.map(({ snapshot: _s, ...r }) => r) }, { cache: "public, s-maxage=60" });
}
