// Core data model for Meme Maloom.
// Designed so a future backend (Reddit/Instagram/YouTube ingestion, moderation
// queue, user accounts) can slot in without changing the shape consumers rely on.

export const LANGUAGES = [
  "Hindi/Hinglish",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Kannada",
  "Bengali",
  "Marathi",
  "Gujarati",
  "Punjabi",
  "Other",
] as const;
export type Language = (typeof LANGUAGES)[number];

export const REGIONS = [
  "North India",
  "South India",
  "East India",
  "West India",
  "Northeast India",
  "Pan-India",
] as const;
export type Region = (typeof REGIONS)[number];

export const CATEGORIES = [
  "Bollywood",
  "Cricket",
  "Politics",
  "College Life",
  "Office Life",
  "Relationships",
  "Food",
  "Festivals",
  "Gaming",
  "Internet Slang",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONTENT_TYPES = [
  "Image macro",
  "Dialogue/quote",
  "Video clip",
  "GIF",
  "Audio/sound",
  "Format/template",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export type MemeStatus = "published" | "pending_review" | "removed";

export type CopyrightStatus =
  | "attributed_fair_use"
  | "creator_verified"
  | "takedown_requested"
  | "under_review";

export interface SourcePlatformLink {
  platform: string;
  url: string;
}

export interface Meme {
  id: string;
  title: string;
  slug: string;
  /** One-line summary shown on cards */
  description: string;
  /** Longer plain-English explanation of what the meme means and why it's funny */
  explanation: string;
  /** Third-party media is never mirrored — this is a labelled placeholder only */
  imageUrl: null;
  imagePlaceholderLabel: string;
  placeholderTone: "saffron" | "navy" | "pink" | "mint";
  sourceUrl: string;
  sourcePlatform: string;
  creator?: string;
  language: Language;
  region: Region;
  category: Category;
  contentType: ContentType;
  tags: string[];
  originDate: string; // ISO date, first-known-usage
  originStory: string;
  culturalContext: string;
  translation?: string;
  transliteration?: string;
  variations: string[];
  relatedSlugs: string[];
  popularityScore: number; // 0-100 composite score
  growth24h: number; // percentage change, demo data
  shareCount: number;
  explainViewCount: number;
  status: MemeStatus;
  copyrightStatus: CopyrightStatus;
}

export interface LanguageInfo {
  language: Language;
  nativeName: string;
  description: string;
  popularTopics: string[];
  examplePhrase: {
    script: string;
    transliteration: string;
    meaning: string;
  };
}

export interface RegionInfo {
  region: Region;
  states: string[];
  description: string;
}

export interface CategoryInfo {
  category: Category;
  emoji: string;
  description: string;
}
