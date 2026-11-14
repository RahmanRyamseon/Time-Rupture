import { z } from "zod";
import { apiError, json, parseBody, requireUser } from "@/lib/api/http";
import { revalidateAttarById } from "@/lib/api/entity";

const Body = z.object({ status: z.enum(["published", "hidden"]) });

export async function POST(req: Request, ctx: RouteContext<"/api/v1/moderation/reviews/[id]">) {
  const auth = await requireUser("editor");
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError(400, "Bad id");
  const body = await parseBody(req, Body);
  if (body instanceof Response) return body;
  const { error } = await auth.supabase.rpc("moderate_review", { p_id: id, p_status: body.status });
  if (error) return apiError(400, error.message);
  const { data } = await auth.supabase.from("reviews").select("attar_id").eq("id", id).maybeSingle();
  if (data) await revalidateAttarById(auth.supabase, data.attar_id as string);
  return json({ ok: true });
}
