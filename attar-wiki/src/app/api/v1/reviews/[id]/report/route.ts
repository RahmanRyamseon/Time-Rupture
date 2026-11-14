import { z } from "zod";
import { apiError, json, parseBody, requireUser } from "@/lib/api/http";
import { revalidateAttarById } from "@/lib/api/entity";

const Body = z.object({
  reason: z.enum(["spam", "abuse", "off_topic", "copied_text", "commercial", "other"]),
  details: z.string().trim().max(500).optional(),
});

export async function POST(req: Request, ctx: RouteContext<"/api/v1/reviews/[id]/report">) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError(400, "Bad id");
  const body = await parseBody(req, Body);
  if (body instanceof Response) return body;
  const { error } = await auth.supabase
    .from("review_reports")
    .insert({ review_id: id, reporter_id: auth.user.id, reason: body.reason, details: body.details ?? null });
  if (error) return apiError(error.code === "23505" ? 409 : 400, error.code === "23505" ? "Already reported" : error.message);
  const { data } = await auth.supabase.from("reviews").select("attar_id").eq("id", id).maybeSingle();
  if (data) await revalidateAttarById(auth.supabase, data.attar_id as string);
  return json({ ok: true }, { status: 201 });
}
