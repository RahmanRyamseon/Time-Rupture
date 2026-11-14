import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, json, parseBody, requireUser } from "@/lib/api/http";
import { loadShelf } from "@/lib/api/shelf";

export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  return json({ items: await loadShelf(ctx) }, { cache: "private, no-store" });
}

const Put = z.object({ attarId: z.uuid(), status: z.enum(["own", "want", "tried"]), note: z.string().max(500).optional() });

export async function PUT(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const body = await parseBody(req, Put);
  if (body instanceof Response) return body;
  const { error } = await ctx.supabase.from("shelf_items").upsert(
    { user_id: ctx.user.id, attar_id: body.attarId, status: body.status, personal_note: body.note ?? null, updated_at: new Date().toISOString() },
    { onConflict: "user_id,attar_id" },
  );
  if (error) return apiError(400, error.message);
  return json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const id = z.uuid().safeParse(req.nextUrl.searchParams.get("attar"));
  if (!id.success) return apiError(400, "attar must be a uuid");
  await ctx.supabase.from("shelf_items").delete().eq("user_id", ctx.user.id).eq("attar_id", id.data);
  return json({ ok: true });
}
