export type Locale = "ar" | "en";
export type Bi = { ar: string; en: string };

export interface Citation {
  id: string;
  url: string;
  title: string;
  publisher: string;
  accessed: string;
  quote: string;
}

/** field name -> citation ids. Citations are attached per field, never per page. */
export type FieldCitations = Record<string, string[]>;

export interface TaxItem {
  id: string;
  name: Bi;
  order: number;
}

export interface House {
  id: string;
  slug: Bi;
  name: Bi;
  country: Bi;
  city: Bi;
  foundedYear: number | null;
  founder: Bi;
  history: Bi;
  officialWebsite: string;
  citations: FieldCitations;
}

export interface NoteRef {
  note: string;
  origin?: string;
}

export interface Price {
  min: number;
  max: number;
  currency: string;
  sizeText: Bi;
  observedOn: string;
  citationId: string;
  note: Bi;
}

export interface Product {
  id: string;
  slug: Bi;
  name: Bi;
  houseId: string;
  category: string;
  origins: string[];
  wildStatus: string;
  notes: { top: NoteRef[]; heart: NoteRef[]; base: NoteRef[] };
  description: Bi;
  occasions: string[];
  seasons: string[];
  size: { value: number | null; unit: string; note: Bi };
  officialUrl: string;
  prices: Price[];
  citations: FieldCitations;
  /** extrait | parfum | edp | edt | cologne | oil — only when the house states it */
  concentration: string;
  /** unisex | men | women — only when the house states it */
  gender: string;
  /** Edwards fragrance-wheel sub-family, estimated from listed notes (needs ≥3 matched notes) */
  family: string;
  /** "curated" (hand-researched) or "collected" (official store catalogue) */
  source: "curated" | "collected";
}

export interface Origin {
  id: string;
  slug: Bi;
  name: Bi;
  region: Bi;
  species: string;
  profile: Bi;
  smell: Bi;
  grading: Bi;
  uses: Bi;
  citations: FieldCitations;
}

export interface Note {
  id: string;
  slug: Bi;
  name: Bi;
  family: string;
  /** Edwards fragrance-wheel sub-family of this note */
  edwards: string;
  description: Bi;
  citations: FieldCitations;
}

export type ArticleKind = "culture" | "guide";

export interface Article {
  id: string;
  kind: ArticleKind;
  slug: Bi;
  title: Bi;
  summary: Bi;
  body: Bi;
  citations: string[];
  updated: string;
}

export interface Content {
  generatedAt: string;
  citations: Record<string, Citation>;
  taxonomy: Record<string, TaxItem[]>;
  houses: House[];
  products: Product[];
  origins: Origin[];
  notes: Note[];
  articles: Article[];
}

export type EntityType = "product" | "house" | "origin" | "note" | "culture" | "guide";
