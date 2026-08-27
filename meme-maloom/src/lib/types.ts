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

export const ILLUSTRATION_ICONS = [
  "crown",
  "mask",
  "cricketBat",
  "laptop",
  "chalkboard",
  "mic",
  "podium",
  "thali",
  "fireworks",
  "thumbsChat",
  "gameController",
  "chatBubbles",
  "danceFigure",
  "dhol",
  "cookingPot",
  "shockedFace",
  "trophy",
  "sword",
  "tvFrame",
  "trainHeart",
  "chartTicker",
  "pickaxe",
  "magnifier",
] as const;
export type IllustrationIcon = (typeof ILLUSTRATION_ICONS)[number];

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

/**
 * Official, platform-approved embed formats only. An embed never downloads,
 * caches, proxies or transforms the underlying media — it's always a live
 * frame/widget served directly from the originating platform, subject to
 * that platform's own terms and availability.
 */
export const EMBED_TYPES = ["youtube", "twitter", "instagram", "tenor"] as const;
export type EmbedType = (typeof EMBED_TYPES)[number];

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
  /**
   * A real, admin-uploaded media file hosted on this site (served from
   * /public/uploads), or null to fall back to the illustration placeholder.
   * Uploaded only through the password-gated /admin tool — never scraped
   * or auto-fetched. Pair with `uploadedMediaKind` to know how to render it.
   */
  imageUrl: string | null;
  uploadedMediaKind?: "image" | "video";
  imagePlaceholderLabel: string;
  placeholderTone: "saffron" | "navy" | "pink" | "mint";
  /** Original illustration icon shown on the placeholder card — never a reproduction of the real meme image. Falls back to a category default when unset. */
  illustrationIcon?: IllustrationIcon;
  sourceUrl: string;
  sourcePlatform: string;
  /**
   * Opt-in official embed. Set BOTH fields to enable — embedType alone does
   * nothing. Only a canonical platform URL (verified by parseEmbed in
   * lib/embeds.ts) will actually render; anything else silently falls back
   * to the illustration + source link. Flip embedAllowed to false to pull
   * an embed for a disputed entry without touching anything else.
   */
  embedType?: EmbedType;
  embedAllowed?: boolean;
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
