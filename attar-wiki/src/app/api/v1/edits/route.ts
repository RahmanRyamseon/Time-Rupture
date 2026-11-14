import type { NextRequest } from "next/server";
import { apiError, json, parseBody, requireUser, revalidateWiki } from "@/lib/api/http";
import { EditInput, fieldsSchema } from "@/lib/api/edits";
import { SECTION_DEFS } from "@/lib/sections";
import { z } from "zod";

/** GET /api/v1/edits?status=pending (editors) or ?mine=1 */
export async function GET(req: NextRequest) {
  const mine = req.nextUrl.searchParams.get("mine");
  const ctx = await requireUser(mine ? "contributor" : "editor");
  if (ctx instanceof Response) return ctx;
  let q = ctx.supabase
    .from("edit_suggestions")
    .select("id, entity_type, entity_id, summary, status, created_at, reviewed_at, review_note, applied_entity_id, submitted_by")
    .order("created_at", { ascending: false })
    .limit(100);
  if (mine) q = q.eq("submitted_by", ctx.user.id);
  else q = q.eq("status", req.nextUrl.searchParams.get("status") ?? "pending");
  const { data, error } = await q;
  if (error) return apiError(400, error.message);
  return json({ edits: data }, { cache: "private, no-store" });
}

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const body = await parseBody(req, EditInput);
  if (body instanceof Response) return body;

  const def = SECTION_DEFS[body.section];
  const fields = fieldsSchema(body.section).safeParse(body.fields);
  if (!fields.success) return apiError(422, "Invalid fields", z.flattenError(fields.error));
  if (!body.entityId && !fields.data.slug) return apiError(422, "New pages need a slug");
  if (!body.entityId && !fields.data[def.titleField]) return apiError(422, `New pages need a ${def.titleField}`);
  if (def.type !== "attar" && (body.notes || body.relations || body.priceReport)) {
    return apiError(422, "Notes, relations and prices only apply to attars");
  }
  const citable = new Set([...def.fields.map((f) => f.name), "notes", "price"]);
  if (body.citations?.some((c) => !citable.has(c.field_name))) return apiError(422, "Citation field is not part of this page");

  const proposed: Record<string, unknown> = { fields: fields.data };
  if (body.notes) proposed.notes = body.notes;
  if (body.relations) proposed.relations = body.relations;
  if (body.priceReport) proposed.price_report = body.priceReport;
  if (body.citations?.length) proposed.citations = body.citations;

  const isEmpty = Object.keys(fields.data).length === 0 && !body.notes && !body.relations && !body.priceReport && !body.citations?.length;
  if (isEmpty) return apiError(422, "No changes");

  const { data: created, error } = await ctx.supabase
    .from("edit_suggestions")
    .insert({
      entity_type: def.type,
      entity_id: body.entityId ?? null,
      base_revision_id: body.baseRevisionId ?? null,
      proposed,
      summary: body.summary,
      submitted_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) return apiError(400, error.message);

  // Editors publish directly (still through the same audited function).
  if (ctx.role === "editor" || ctx.role === "admin") {
    const { data: targetId, error: approveError } = await ctx.supabase.rpc("approve_edit_suggestion", {
      p_id: created.id,
      p_note: "Self-approved by editor",
    });
    if (approveError) return apiError(400, approveError.message, { editId: created.id });
    const { data: row } = await ctx.supabase.from(def.table).select("slug").eq("id", targetId).maybeSingle();
    if (row?.slug) revalidateWiki(`/${body.section}/${row.slug}`, `/${body.section}`, "/");
    return json({ id: created.id, status: "approved", slug: row?.slug ?? null }, { status: 201 });
  }
  return json({ id: created.id, status: "pending" }, { status: 201 });
}
