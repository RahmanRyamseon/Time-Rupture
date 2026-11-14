import "server-only";
import { z } from "zod";
import { SECTION_DEFS, type FieldDef, type Section } from "@/lib/sections";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function fieldSchema(f: FieldDef): z.ZodType {
  const max = f.maxLength ?? 50_000;
  switch (f.kind) {
    case "number":
      return z.number().finite().nullable();
    case "url":
      return z.url({ protocol: /^https?$/ }).max(500).nullable();
    case "tags":
      return z.array(z.string().trim().min(1).max(80)).max(40);
    case "select":
      return z.enum(f.options as [string, ...string[]]).nullable();
    case "house_ref":
    case "region_ref":
      return z.uuid().nullable();
    default:
      if (f.name === "slug") return z.string().regex(SLUG).max(80);
      return z.string().trim().max(max).nullable();
  }
}

export function fieldsSchema(section: Section) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of SECTION_DEFS[section].fields) shape[f.name] = fieldSchema(f).optional();
  return z.object(shape).strict();
}

export const CitationInput = z.object({
  field_name: z.string().min(1).max(40),
  url: z.url({ protocol: /^https?$/ }).max(1000),
  title: z.string().trim().min(2).max(300),
  publisher: z.string().trim().max(200).optional().nullable(),
  accessed_at: z.iso.date().optional(),
});

export const EditInput = z.object({
  section: z.enum(["attars", "houses", "notes", "regions", "glossary", "guides"]),
  entityId: z.uuid().nullable().optional(),
  baseRevisionId: z.number().int().positive().nullable().optional(),
  summary: z.string().trim().min(5).max(500),
  fields: z.record(z.string(), z.unknown()).default({}),
  notes: z
    .array(z.object({ note_id: z.uuid(), position: z.enum(["top", "heart", "base"]) }))
    .max(60)
    .optional(),
  relations: z
    .array(
      z
        .object({
          related_attar_id: z.uuid().nullable().optional(),
          external_name: z.string().trim().max(120).nullable().optional(),
          relation: z.enum(["similar", "clone_of", "inspired_by"]),
          note: z.string().trim().max(300).nullable().optional(),
        })
        .refine((r) => r.related_attar_id || r.external_name, "Pick an attar or name an external fragrance"),
    )
    .max(40)
    .optional(),
  priceReport: z
    .object({
      price_min_inr: z.number().nonnegative().max(10_000_000),
      price_max_inr: z.number().nonnegative().max(10_000_000),
      volume_ml: z.number().positive().max(10_000),
      reported_on: z.iso.date(),
      source_name: z.string().trim().min(2).max(200),
      source_url: z.url({ protocol: /^https?$/ }).max(1000).nullable().optional(),
      note: z.string().trim().max(300).nullable().optional(),
    })
    .refine((p) => p.price_max_inr >= p.price_min_inr, "Max must be ≥ min")
    .nullable()
    .optional(),
  citations: z.array(CitationInput).max(50).optional(),
});

export type EditInputT = z.infer<typeof EditInput>;
