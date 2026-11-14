import { getAttar } from "@/lib/data/wiki";
import { apiError, json, PUBLIC_CACHE } from "@/lib/api/http";

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/attars/[slug]">) {
  const { slug } = await ctx.params;
  const data = await getAttar(slug);
  if (!data || !data.attar.published) return apiError(404, "Not found");
  return json(data, { cache: PUBLIC_CACHE });
}
