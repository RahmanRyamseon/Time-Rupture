import { z } from "zod";
import { apiError, json, parseBody, requireUser, revalidateWiki } from "@/lib/api/http";
import { TYPE_TO_SECTION, SECTION_DEFS } from "@/lib/sections";
import type { EntityType } from "@/lib/types";

const Body = z.object({ action: z.enum(["approve", "reject"]), note: z.string().trim().max(500).optional() });

export async function POST(req: Request, ctx: RouteContext<"/api/v1/edits/[id]">) {
  const auth = await requireUser("editor");
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError(400, "Bad id");
  const body = await parseBody(req, Body);
  if (body instanceof Response) return body;

  if (body.action === "reject") {
    if (!body.note) return apiError(422, "Explain why the edit was rejected");
    const { error } = await auth.supabase.rpc("reject_edit_suggestion", { p_id: id, p_note: body.note });
    if (error) return apiError(400, error.message);
    return json({ ok: true, status: "rejected" });
  }

  const { data: suggestion } = await auth.supabase.from("edit_suggestions").select("entity_type").eq("id", id).maybeSingle();
  if (!suggestion) return apiError(404, "Not found");
  const { data: targetId, error } = await auth.supabase.rpc("approve_edit_suggestion", { p_id: id, p_note: body.note ?? null });
  if (error) return apiError(400, error.message);
  const section = TYPE_TO_SECTION[suggestion.entity_type as EntityType];
  const { data: row } = await auth.supabase.from(SECTION_DEFS[section].table).select("slug").eq("id", targetId).maybeSingle();
  if (row?.slug) revalidateWiki(`/${section}/${row.slug}`, `/${section}`, "/");
  return json({ ok: true, status: "approved", slug: row?.slug ?? null });
}
