import { apiError, json, publicClient } from "@/lib/api/http";

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/revisions/[id]">) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) return apiError(400, "Bad id");
  const supabase = await publicClient();
  if (!supabase) return apiError(503, "Not configured");
  const { data: current } = await supabase.from("revisions").select("*").eq("id", n).maybeSingle();
  if (!current) return apiError(404, "Not found");
  const { data: previous } = await supabase
    .from("revisions")
    .select("*")
    .eq("entity_type", current.entity_type)
    .eq("entity_id", current.entity_id)
    .lt("id", n)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return json({ current, previous }, { cache: "public, s-maxage=86400, immutable" });
}
