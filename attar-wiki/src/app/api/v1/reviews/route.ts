import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, json, parseBody, publicClient, requireUser } from "@/lib/api/http";
import { revalidateAttarById } from "@/lib/api/entity";

const SELECT = "id, attar_id, user_id, body, skin_type, climate, city, status, report_count, created_at, updated_at";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const attar = z.uuid().safeParse(p.get("attar"));
  if (!attar.success) return apiError(400, "attar must be a uuid");
  if (p.get("mine")) {
    const ctx = await requireUser();
    if (ctx instanceof Response) return ctx;
    const { data } = await ctx.supabase.from("reviews").select(SELECT).eq("attar_id", attar.data).eq("user_id", ctx.user.id);
    return json({ reviews: data ?? [] }, { cache: "private, no-store" });
  }
  const supabase = await publicClient();
  if (!supabase) return json({ reviews: [] });
  const { data } = await supabase
    .from("reviews")
    .select(SELECT)
    .eq("attar_id", attar.data)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(Math.min(Number(p.get("limit")) || 30, 100));
  return json({ reviews: data ?? [] }, { cache: "public, s-maxage=60" });
}

const Body = z.object({
  attarId: z.uuid(),
  body: z.string().trim().min(20).max(1500),
  skinType: z.enum(["dry", "normal", "oily", "combination", "unsure"]).nullable().optional(),
  climate: z.enum(["hot_dry", "hot_humid", "monsoon", "temperate", "cold"]).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
});

function row(body: z.infer<typeof Body>) {
  return { body: body.body, skin_type: body.skinType ?? null, climate: body.climate ?? null, city: body.city || null };
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const body = await parseBody(req, Body);
  if (body instanceof Response) return body;
  const { data, error } = await ctx.supabase
    .from("reviews")
    .insert({ attar_id: body.attarId, user_id: ctx.user.id, ...row(body) })
    .select(SELECT)
    .single();
  if (error) return apiError(error.code === "23505" ? 409 : 400, error.code === "23505" ? "You already reviewed this attar" : error.message);
  if (data.status === "published") await revalidateAttarById(ctx.supabase, body.attarId);
  return json({ review: data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const body = await parseBody(req, Body);
  if (body instanceof Response) return body;
  const { data, error } = await ctx.supabase
    .from("reviews")
    .update(row(body))
    .eq("attar_id", body.attarId)
    .eq("user_id", ctx.user.id)
    .select(SELECT)
    .single();
  if (error) return apiError(400, error.message);
  await revalidateAttarById(ctx.supabase, body.attarId);
  return json({ review: data });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const id = z.uuid().safeParse(req.nextUrl.searchParams.get("id"));
  if (!id.success) return apiError(400, "id must be a uuid");
  const { data, error } = await ctx.supabase.from("reviews").delete().eq("id", id.data).select("attar_id").maybeSingle();
  if (error) return apiError(400, error.message);
  if (!data) return apiError(404, "Not found");
  await revalidateAttarById(ctx.supabase, data.attar_id as string);
  return json({ ok: true });
}
