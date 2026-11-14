import { z } from "zod";
import { apiError, json, parseBody, requireUser } from "@/lib/api/http";

export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const { data } = await ctx.supabase.from("profiles").select("id, display_name, role, city, bio").eq("id", ctx.user.id).maybeSingle();
  return json({ user: { id: ctx.user.id, email: ctx.user.email }, profile: data }, { cache: "private, no-store" });
}

const Patch = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  city: z.string().trim().max(80).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const body = await parseBody(req, Patch);
  if (body instanceof Response) return body;
  const update: Record<string, unknown> = {};
  if (body.displayName !== undefined) update.display_name = body.displayName;
  if (body.city !== undefined) update.city = body.city || null;
  if (body.bio !== undefined) update.bio = body.bio || null;
  const { data, error } = await ctx.supabase.from("profiles").update(update).eq("id", ctx.user.id).select().maybeSingle();
  if (error) return apiError(400, error.message);
  return json({ profile: data });
}
