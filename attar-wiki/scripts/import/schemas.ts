import { z } from "zod";

/* CSV cells are strings. These helpers turn "" into null and parse lists/numbers/bools. */
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const text = (max = 50_000) => z.preprocess(blank, z.string().trim().max(max).optional()).transform((v) => v ?? null);
const required = (max = 300) => z.string().trim().min(1, "required").max(max);
const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase letters, digits and single hyphens only").max(80);
const optSlug = z.preprocess(blank, slug.optional());
/** Pipe-separated list: "khus|खस|vetiver" */
const list = z
  .preprocess(blank, z.string().optional())
  .transform((v) => (v ? v.split("|").map((x) => x.trim()).filter(Boolean) : []));
const int = (min: number, max: number) => z.preprocess(blank, z.coerce.number().int().min(min).max(max).optional()).transform((v) => v ?? null);
const num = (min: number, max: number) => z.preprocess(blank, z.coerce.number().min(min).max(max).optional()).transform((v) => v ?? null);
const money = z.coerce.number().min(0).max(10_000_000);
const bool = (def: boolean) =>
  z
    .preprocess(blank, z.enum(["true", "false", "yes", "no", "1", "0", "TRUE", "FALSE"]).optional())
    .transform((v) => (v == null ? def : ["true", "yes", "1", "TRUE"].includes(v)));
const url = z.preprocess(blank, z.url({ protocol: /^https?$/ }).optional()).transform((v) => v ?? null);
const date = z.iso.date();
const optDate = z.preprocess(blank, z.iso.date().optional()).transform((v) => v ?? null);

export const regions = z.object({
  slug,
  name: required(),
  name_hi: text(200),
  aliases: list,
  state: text(80),
  country: z.preprocess(blank, z.string().trim().max(80).optional()).transform((v) => v ?? "India"),
  summary: text(400),
  summary_hi: text(400),
  history: text(),
  specialities: text(),
  latitude: num(-90, 90),
  longitude: num(-180, 180),
  published: bool(true),
});

export const houses = z.object({
  slug,
  name: required(),
  name_hi: text(200),
  aliases: list,
  city: text(80),
  region_slug: optSlug,
  founded_year: int(1000, 2100),
  summary: text(400),
  summary_hi: text(400),
  history: text(),
  website_url: url,
  published: bool(true),
});

export const notes = z.object({
  slug,
  name: required(),
  name_hi: text(200),
  aliases: list,
  botanical_name: text(200),
  category: text(40),
  summary: text(400),
  summary_hi: text(400),
  smell: text(),
  botany: text(),
  grown_in: text(),
  published: bool(true),
});

export const attars = z.object({
  slug,
  name: required(),
  name_hi: text(200),
  aliases: list,
  house_slug: optSlug,
  attar_type: z
    .preprocess(blank, z.enum(["natural_deg_bhapka", "blended", "synthetic", "ruh"]).optional())
    .transform((v) => v ?? null),
  base_oil: text(120),
  scent_family: text(60),
  region_slug: optSlug,
  launch_year: int(1000, 2100),
  occasions: list,
  summary: text(400),
  summary_hi: text(400),
  description: text(),
  how_made: text(),
  published: bool(true),
});

export const attar_notes = z.object({
  attar_slug: slug,
  note_slug: slug,
  position: z.enum(["top", "heart", "base"]),
  sort_order: int(0, 1000),
});

export const attar_relations = z
  .object({
    attar_slug: slug,
    relation: z.enum(["similar", "clone_of", "inspired_by"]),
    related_attar_slug: optSlug,
    external_name: text(120),
    note: text(300),
  })
  .refine((r) => r.related_attar_slug || r.external_name, { message: "set related_attar_slug or external_name" })
  .refine((r) => r.related_attar_slug !== r.attar_slug, { message: "an attar cannot relate to itself" });

export const price_reports = z
  .object({
    attar_slug: slug,
    price_min_inr: money,
    price_max_inr: money,
    volume_ml: z.coerce.number().positive().max(10_000),
    reported_on: date,
    source_name: required(200),
    source_url: url,
    note: text(300),
  })
  .refine((p) => p.price_max_inr >= p.price_min_inr, { message: "price_max_inr must be ≥ price_min_inr" });

export const glossary = z.object({
  slug,
  term: required(),
  term_hi: text(200),
  aliases: list,
  short_definition: text(300),
  short_definition_hi: text(300),
  body: text(),
  published: bool(true),
});

export const guides = z.object({
  slug,
  title: required(),
  title_hi: text(200),
  summary: text(400),
  summary_hi: text(400),
  body_file: z.preprocess(blank, z.string().regex(/^[\w.-]+\.md$/, "a .md file name inside seed/guides").optional()),
  author_name: text(80),
  published: bool(false),
  published_at: optDate,
});

const entityType = z.enum(["attar", "house", "note", "region", "glossary", "guide"]);

export const citations = z.object({
  entity_type: entityType,
  entity_slug: slug,
  field_name: required(40),
  url: z.url({ protocol: /^https?$/ }),
  title: required(300),
  publisher: text(200),
  accessed_at: z.preprocess(blank, z.iso.date().optional()).transform((v) => v ?? new Date().toISOString().slice(0, 10)),
  quote: text(300),
});

export const media = z
  .object({
    entity_type: entityType,
    entity_slug: slug,
    file: z.string().trim().regex(/^[\w./-]+$/, "a file path inside seed/media"),
    alt: z.string().trim().min(3).max(200),
    license: z.enum(["CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0", "OWN-WORK-CC-BY-SA-4.0", "BRAND-PERMISSION"]),
    credit: required(200),
    source_url: url,
    permission_note: text(1000),
    is_primary: bool(false),
  })
  .refine((m) => m.license !== "BRAND-PERMISSION" || m.permission_note, { message: "BRAND-PERMISSION needs permission_note" });

export const SCHEMAS = {
  regions: { file: "regions.csv", schema: regions },
  houses: { file: "houses.csv", schema: houses },
  notes: { file: "notes.csv", schema: notes },
  attars: { file: "attars.csv", schema: attars },
  attar_notes: { file: "attar_notes.csv", schema: attar_notes },
  attar_relations: { file: "attar_relations.csv", schema: attar_relations },
  price_reports: { file: "price_reports.csv", schema: price_reports },
  glossary: { file: "glossary.csv", schema: glossary },
  guides: { file: "guides.csv", schema: guides },
  citations: { file: "citations.csv", schema: citations },
  media: { file: "media.csv", schema: media },
} as const;

export type EntityName = keyof typeof SCHEMAS;
export const ENTITY_ORDER = Object.keys(SCHEMAS) as EntityName[];
