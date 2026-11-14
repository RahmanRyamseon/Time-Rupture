import { z } from "zod";
import { apiError, json, parseBody, requireUser } from "@/lib/api/http";
import { loadShelf } from "@/lib/api/shelf";

const Body = z.object({
  ops: z
    .array(z.object({ attarId: z.uuid(), status: z.enum(["own", "want", "tried"]).nullable(), at: z.iso.datetime() }))
    .max(500),
});

/**
 * Offline sync: applies queued shelf operations (last write per attar wins,
 * compared with the server's updated_at) and returns the full shelf.
 */
export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const body = await parseBody(req, Body);
  if (body instanceof Response) return body;

  const latest = new Map<string, (typeof body.ops)[number]>();
  for (const op of body.ops) {
    const prev = latest.get(op.attarId);
    if (!prev || prev.at < op.at) latest.set(op.attarId, op);
  }
  if (latest.size) {
    const { data: existing } = await ctx.supabase
      .from("shelf_items")
      .select("attar_id, updated_at")
      .eq("user_id", ctx.user.id)
      .in("attar_id", [...latest.keys()]);
    const serverTime = new Map((existing ?? []).map((r) => [r.attar_id as string, r.updated_at as string]));
    const upserts = [];
    const deletes = [];
    for (const op of latest.values()) {
      const st = serverTime.get(op.attarId);
      if (st && new Date(st) > new Date(op.at)) continue; // server is newer (another device)
      if (op.status) upserts.push({ user_id: ctx.user.id, attar_id: op.attarId, status: op.status, updated_at: op.at });
      else deletes.push(op.attarId);
    }
    if (upserts.length) {
      const { error } = await ctx.supabase.from("shelf_items").upsert(upserts, { onConflict: "user_id,attar_id" });
      if (error) return apiError(400, error.message);
    }
    if (deletes.length) await ctx.supabase.from("shelf_items").delete().eq("user_id", ctx.user.id).in("attar_id", deletes);
  }
  return json({ items: await loadShelf(ctx) }, { cache: "private, no-store" });
}
