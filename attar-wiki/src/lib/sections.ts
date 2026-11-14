import type { EntityType } from "./types";

export type FieldKind =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "url"
  | "tags"
  | "select"
  | "house_ref"
  | "region_ref";

export interface FieldDef {
  name: string;
  kind: FieldKind;
  /** Field is a factual claim that should carry a citation */
  citable?: boolean;
  /** Optional Hindi field (shown under a "Hindi" fieldset in the editor) */
  hindi?: boolean;
  required?: boolean;
  options?: readonly string[];
  maxLength?: number;
}

export interface SectionDef {
  section: Section;
  type: EntityType;
  table: string;
  titleField: "name" | "term" | "title";
  fields: FieldDef[];
}

export const SECTIONS = ["attars", "houses", "notes", "regions", "glossary", "guides"] as const;
export type Section = (typeof SECTIONS)[number];

const slugField: FieldDef = { name: "slug", kind: "text", required: true, maxLength: 80 };

export const SECTION_DEFS: Record<Section, SectionDef> = {
  attars: {
    section: "attars",
    type: "attar",
    table: "attars",
    titleField: "name",
    fields: [
      { name: "name", kind: "text", required: true, maxLength: 120 },
      slugField,
      { name: "name_hi", kind: "text", hindi: true, maxLength: 120 },
      { name: "aliases", kind: "tags" },
      { name: "house_id", kind: "house_ref", citable: true },
      {
        name: "attar_type",
        kind: "select",
        citable: true,
        options: ["natural_deg_bhapka", "blended", "synthetic", "ruh"],
      },
      { name: "base_oil", kind: "text", citable: true, maxLength: 120 },
      { name: "scent_family", kind: "text", maxLength: 60 },
      { name: "region_id", kind: "region_ref", citable: true },
      { name: "launch_year", kind: "number", citable: true },
      { name: "occasions", kind: "tags" },
      { name: "summary", kind: "textarea", maxLength: 400 },
      { name: "summary_hi", kind: "textarea", hindi: true, maxLength: 400 },
      { name: "description", kind: "markdown", citable: true },
      { name: "how_made", kind: "markdown", citable: true },
    ],
  },
  houses: {
    section: "houses",
    type: "house",
    table: "houses",
    titleField: "name",
    fields: [
      { name: "name", kind: "text", required: true, maxLength: 120 },
      slugField,
      { name: "name_hi", kind: "text", hindi: true, maxLength: 120 },
      { name: "aliases", kind: "tags" },
      { name: "city", kind: "text", citable: true, maxLength: 80 },
      { name: "region_id", kind: "region_ref" },
      { name: "founded_year", kind: "number", citable: true },
      { name: "website_url", kind: "url", citable: true },
      { name: "summary", kind: "textarea", maxLength: 400 },
      { name: "summary_hi", kind: "textarea", hindi: true, maxLength: 400 },
      { name: "history", kind: "markdown", citable: true },
    ],
  },
  notes: {
    section: "notes",
    type: "note",
    table: "notes",
    titleField: "name",
    fields: [
      { name: "name", kind: "text", required: true, maxLength: 80 },
      slugField,
      { name: "name_hi", kind: "text", hindi: true, maxLength: 80 },
      { name: "aliases", kind: "tags" },
      { name: "botanical_name", kind: "text", citable: true, maxLength: 120 },
      { name: "category", kind: "text", maxLength: 40 },
      { name: "summary", kind: "textarea", maxLength: 400 },
      { name: "summary_hi", kind: "textarea", hindi: true, maxLength: 400 },
      { name: "smell", kind: "markdown", citable: true },
      { name: "botany", kind: "markdown", citable: true },
      { name: "grown_in", kind: "markdown", citable: true },
    ],
  },
  regions: {
    section: "regions",
    type: "region",
    table: "regions",
    titleField: "name",
    fields: [
      { name: "name", kind: "text", required: true, maxLength: 80 },
      slugField,
      { name: "name_hi", kind: "text", hindi: true, maxLength: 80 },
      { name: "aliases", kind: "tags" },
      { name: "state", kind: "text", maxLength: 80 },
      { name: "country", kind: "text", maxLength: 80 },
      { name: "summary", kind: "textarea", maxLength: 400 },
      { name: "summary_hi", kind: "textarea", hindi: true, maxLength: 400 },
      { name: "history", kind: "markdown", citable: true },
      { name: "specialities", kind: "markdown", citable: true },
      { name: "latitude", kind: "number" },
      { name: "longitude", kind: "number" },
    ],
  },
  glossary: {
    section: "glossary",
    type: "glossary",
    table: "glossary",
    titleField: "term",
    fields: [
      { name: "term", kind: "text", required: true, maxLength: 80 },
      slugField,
      { name: "term_hi", kind: "text", hindi: true, maxLength: 80 },
      { name: "aliases", kind: "tags" },
      { name: "short_definition", kind: "textarea", citable: true, maxLength: 300 },
      { name: "short_definition_hi", kind: "textarea", hindi: true, maxLength: 300 },
      { name: "body", kind: "markdown", citable: true },
    ],
  },
  guides: {
    section: "guides",
    type: "guide",
    table: "guides",
    titleField: "title",
    fields: [
      { name: "title", kind: "text", required: true, maxLength: 140 },
      slugField,
      { name: "title_hi", kind: "text", hindi: true, maxLength: 140 },
      { name: "author_name", kind: "text", maxLength: 80 },
      { name: "summary", kind: "textarea", maxLength: 400 },
      { name: "summary_hi", kind: "textarea", hindi: true, maxLength: 400 },
      { name: "body", kind: "markdown", citable: true },
    ],
  },
};

export const TYPE_TO_SECTION: Record<EntityType, Section> = {
  attar: "attars",
  house: "houses",
  note: "notes",
  region: "regions",
  glossary: "glossary",
  guide: "guides",
};

export function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value);
}

export function entityPath(type: EntityType, slug: string) {
  return `/${TYPE_TO_SECTION[type]}/${slug}`;
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
