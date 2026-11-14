import { z } from "zod";
import { apiError, json, parseBody, requireUser, revalidateWiki } from "@/lib/api/http";
import { SECTION_DEFS, TYPE_TO_SECTION } from "@/lib/sections";
import type { EntityType } from "@/lib/types";

const Body = z.object({ action: z.enum(["approve", "reject"]), primary: z.boolean().optional() });

export async function POST(req: Request, ctx: RouteContext<"/api/v1/media/[id]">) {
  const auth = await requireUser("editor");
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError(400, "Bad id");
  const body = await parseBody(req, Body);
  if (body instanceof Response) return body;
  const { data: media } = await auth.supabase.from("media").select("*").eq("id", id).maybeSingle();
  if (!media) return apiError(404, "Not found");

  if (body.action === "reject") {
    await auth.supabase.from("media").update({ status: "rejected", reviewed_by: auth.user.id }).eq("id", id);
    await auth.supabase.storage.from("media").remove([media.storage_path as string]);
    return json({ ok: true, status: "rejected" });
  }
  if (body.primary) {
    await auth.supabase.from("media").update({ is_primary: false }).eq("entity_type", media.entity_type).eq("entity_id", media.entity_id);
  }
  const { error } = await auth.supabase
    .from("media")
    .update({ status: "approved", reviewed_by: auth.user.id, is_primary: body.primary ?? false })
    .eq("id", id);
  if (error) return apiError(400, error.message);
  const section = TYPE_TO_SECTION[media.entity_type as EntityType];
  const { data: row } = await auth.supabase.from(SECTION_DEFS[section].table).select("slug").eq("id", media.entity_id).maybeSingle();
  if (row?.slug) revalidateWiki(`/${section}/${row.slug}`);
  return json({ ok: true, status: "approved" });
}
