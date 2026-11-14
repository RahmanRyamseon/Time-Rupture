export type EntityType = "attar" | "house" | "note" | "region" | "glossary" | "guide";
export type AttarType = "natural_deg_bhapka" | "blended" | "synthetic" | "ruh";
export type NotePosition = "top" | "heart" | "base";
export type VoteMetric = "longevity" | "sillage" | "heat" | "humidity" | "winter";
export type ShelfStatus = "own" | "want" | "tried";
export type UserRole = "reader" | "contributor" | "editor" | "admin";
export type ReviewStatus = "published" | "pending" | "hidden";
export type SkinType = "dry" | "normal" | "oily" | "combination" | "unsure";
export type ClimateType = "hot_dry" | "hot_humid" | "monsoon" | "temperate" | "cold";
export type RelationType = "similar" | "clone_of" | "inspired_by";

export const VOTE_METRICS: VoteMetric[] = ["longevity", "sillage", "heat", "humidity", "winter"];
export const ATTAR_TYPES: AttarType[] = ["natural_deg_bhapka", "blended", "synthetic", "ruh"];
export const NOTE_POSITIONS: NotePosition[] = ["top", "heart", "base"];
export const SKIN_TYPES: SkinType[] = ["dry", "normal", "oily", "combination", "unsure"];
export const CLIMATES: ClimateType[] = ["hot_dry", "hot_humid", "monsoon", "temperate", "cold"];
export const SHELF_STATUSES: ShelfStatus[] = ["own", "want", "tried"];

interface Base {
  id: string;
  slug: string;
  aliases: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Region extends Base {
  name: string;
  name_hi: string | null;
  state: string | null;
  country: string;
  summary: string | null;
  summary_hi: string | null;
  history: string | null;
  specialities: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface House extends Base {
  name: string;
  name_hi: string | null;
  city: string | null;
  region_id: string | null;
  founded_year: number | null;
  summary: string | null;
  summary_hi: string | null;
  history: string | null;
  website_url: string | null;
}

export interface Note extends Base {
  name: string;
  name_hi: string | null;
  botanical_name: string | null;
  category: string | null;
  summary: string | null;
  summary_hi: string | null;
  smell: string | null;
  botany: string | null;
  grown_in: string | null;
}

export interface Attar extends Base {
  name: string;
  name_hi: string | null;
  house_id: string | null;
  attar_type: AttarType | null;
  base_oil: string | null;
  scent_family: string | null;
  summary: string | null;
  summary_hi: string | null;
  description: string | null;
  how_made: string | null;
  region_id: string | null;
  occasions: string[];
  launch_year: number | null;
}

export interface GlossaryEntry extends Base {
  term: string;
  term_hi: string | null;
  short_definition: string | null;
  short_definition_hi: string | null;
  body: string | null;
}

export interface Guide extends Omit<Base, "aliases"> {
  title: string;
  title_hi: string | null;
  summary: string | null;
  summary_hi: string | null;
  body: string | null;
  author_name: string | null;
  published_at: string | null;
}

export interface Citation {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  field_name: string;
  url: string;
  title: string;
  publisher: string | null;
  accessed_at: string;
  sort_order: number;
}

export interface MediaItem {
  id: string;
  storage_path: string;
  alt: string;
  license: string;
  credit: string;
  source_url: string | null;
  width: number | null;
  height: number | null;
  is_primary: boolean;
}

export interface PriceReport {
  id: string;
  price_min_inr: number;
  price_max_inr: number;
  volume_ml: number;
  reported_on: string;
  source_name: string;
  source_url: string | null;
  note: string | null;
}

export interface VoteStat {
  metric: VoteMetric;
  vote_count: number;
  vote_avg: number | null;
  distribution: number[];
}

export interface AttarNoteRef {
  position: NotePosition;
  sort_order: number;
  note: Pick<Note, "id" | "slug" | "name" | "name_hi">;
}

export interface AttarRelationRef {
  id: string;
  relation: RelationType;
  external_name: string | null;
  note: string | null;
  related: Pick<Attar, "id" | "slug" | "name" | "name_hi"> | null;
}

export interface AttarCard {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  scent_family: string | null;
  attar_type: AttarType | null;
  summary: string | null;
  house: { slug: string; name: string } | null;
}

export interface Revision {
  id: number;
  entity_type: EntityType;
  entity_id: string;
  snapshot: Record<string, unknown>;
  change_summary: string | null;
  changed_by: string | null;
  created_at: string;
  author?: { display_name: string } | null;
}

export interface Review {
  id: string;
  attar_id: string;
  user_id: string;
  body: string;
  skin_type: SkinType | null;
  climate: ClimateType | null;
  city: string | null;
  status: ReviewStatus;
  report_count: number;
  created_at: string;
  updated_at: string;
  author?: { display_name: string } | null;
}

export interface SearchHit {
  entity_type: EntityType;
  entity_id: string;
  slug: string;
  title: string;
  title_hi: string | null;
  subtitle: string | null;
  score: number;
}

export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  city: string | null;
  bio: string | null;
}
