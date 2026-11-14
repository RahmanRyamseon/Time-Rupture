import { z } from "zod";
import { apiError, json, requireUser } from "@/lib/api/http";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

const Meta = z
  .object({
    entityType: z.enum(["attar", "house", "note", "region", "glossary", "guide"]),
    entityId: z.uuid(),
    alt: z.string().trim().min(3).max(200),
    license: z.enum(["CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "OWN-WORK-CC-BY-SA-4.0", "BRAND-PERMISSION"]),
    credit: z.string().trim().min(2).max(200),
    sourceUrl: z.url({ protocol: /^https?$/ }).max(1000).optional().or(z.literal("")),
    permissionNote: z.string().trim().max(1000).optional().or(z.literal("")),
    width: z.coerce.number().int().positive().max(20000).optional(),
    height: z.coerce.number().int().positive().max(20000).optional(),
  })
  .refine((m) => m.license !== "BRAND-PERMISSION" || (m.permissionNote && m.permissionNote.length > 10), {
    message: "Brand images need details of the permission granted",
    path: ["permissionNote"],
  });

/** Multipart upload: `file` + metadata fields. Every image needs a license and credit; editors approve. */
export async function POST(req: Request) {
  const ctx = await requireUser();
  if (ctx instanceof Response) return ctx;
  const form = await req.formData().catch(() => null);
  if (!form) return apiError(400, "Expected multipart/form-data");
  const file = form.get("file");
  if (!(file instanceof File)) return apiError(422, "file is required");
  if (!TYPES[file.type]) return apiError(415, "Only JPEG, PNG, WebP or AVIF images");
  if (file.size > MAX_BYTES) return apiError(413, "Image must be 5 MB or smaller");
  const meta = Meta.safeParse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "file")));
  if (!meta.success) return apiError(422, "Invalid metadata", z.flattenError(meta.error));

  const path = `uploads/${ctx.user.id}/${crypto.randomUUID()}.${TYPES[file.type]}`;
  const { error: upErr } = await ctx.supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return apiError(400, upErr.message);

  const m = meta.data;
  const { data, error } = await ctx.supabase
    .from("media")
    .insert({
      entity_type: m.entityType,
      entity_id: m.entityId,
      storage_path: path,
      alt: m.alt,
      license: m.license,
      credit: m.credit,
      source_url: m.sourceUrl || null,
      permission_note: m.permissionNote || null,
      width: m.width ?? null,
      height: m.height ?? null,
      uploaded_by: ctx.user.id,
      status: "pending",
    })
    .select("id, status")
    .single();
  if (error) {
    await ctx.supabase.storage.from("media").remove([path]);
    return apiError(400, error.message);
  }
  return json({ media: data }, { status: 201 });
}
