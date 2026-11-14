import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, json, parseBody, requireUser } from "@/lib/api/http";
import { revalidateAttarById } from "@/lib/api/entity";

const Metric = z.enum(["longevity", "sillage", "heat", "humidity", "winter"]);

export async function GET(req: NextRequest) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const attar = z.uuid().safeParse(req.nextUrl.searchParams.get("attar"));
  if (!attar.success) return apiError(400, "attar must be a uuid");
  const { data } = await ctx.supabase.from("votes").select("metric, value").eq("attar_id", attar.data).eq("user_id", ctx.user.id);
  return json({ votes: data ?? [] }, { cache: "private, no-store" });
}

const Vote = z.object({ attarId: z.uuid(), metric: Metric, value: z.number().int().min(1).max(5) });

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const body = await parseBody(req, Vote);
  if (body instanceof Response) return body;
  const { error } = await ctx.supabase
    .from("votes")
    .upsert({ user_id: ctx.user.id, attar_id: body.attarId, metric: body.metric, value: body.value }, { onConflict: "user_id,attar_id,metric" });
  if (error) return apiError(400, error.message);
  const { data: stat } = await ctx.supabase
    .from("attar_vote_stats")
    .select("metric, vote_count, vote_avg, distribution")
    .eq("attar_id", body.attarId)
    .eq("metric", body.metric)
    .maybeSingle();
  await revalidateAttarById(ctx.supabase, body.attarId);
  return json({ ok: true, stat });
}

const Clear = z.object({ attarId: z.uuid(), metric: Metric });

export async function DELETE(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const body = await parseBody(req, Clear);
  if (body instanceof Response) return body;
  const { error } = await ctx.supabase
    .from("votes")
    .delete()
    .eq("user_id", ctx.user.id)
    .eq("attar_id", body.attarId)
    .eq("metric", body.metric);
  if (error) return apiError(400, error.message);
  await revalidateAttarById(ctx.supabase, body.attarId);
  return json({ ok: true });
}
