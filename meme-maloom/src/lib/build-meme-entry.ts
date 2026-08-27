import type { Category, ContentType, CopyrightStatus, Language, Region } from "./types";

const DATA_MARKER = "];\n\nexport const languageInfo: LanguageInfo[] = [";

export interface NewMemeInput {
  title: string;
  description?: string;
  explanation?: string;
  sourceUrl: string;
  sourcePlatform: string;
  creator?: string;
  language: Language;
  region: Region;
  category: Category;
  contentType?: ContentType;
  originDate?: string;
  originStory?: string;
  culturalContext?: string;
  tags?: string[];
  copyrightStatus?: CopyrightStatus;
  uploadedMediaKind: "image" | "video";
  imageUrl: string;
}

/** Scans data.ts for the highest existing "mNNN" id and returns the next one. */
export function nextMemeId(dataTsContent: string): string {
  const ids = [...dataTsContent.matchAll(/"m(\d+)"/g)].map((m) => parseInt(m[1], 10));
  const max = ids.length ? Math.max(...ids) : 0;
  return `m${max + 1}`;
}

export function existingSlugs(dataTsContent: string): Set<string> {
  return new Set([...dataTsContent.matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]));
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function uniqueSlug(baseTitle: string, existing: Set<string>): string {
  const base = slugify(baseTitle) || "meme";
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Renders one Meme object as a TS literal matching the file's existing formatting. */
export function serializeMemeEntry(input: NewMemeInput, id: string, slug: string): string {
  const description = input.description?.trim() || input.title;
  const explanation = input.explanation?.trim() || description;
  const originStory = input.originStory?.trim() || `Uploaded via the Meme Maloom admin tool, sourced from ${input.sourcePlatform}.`;
  const culturalContext = input.culturalContext?.trim() || "";
  const originDate = input.originDate?.trim() || new Date().toISOString().slice(0, 10);
  const contentType: ContentType = input.contentType || (input.uploadedMediaKind === "video" ? "Video clip" : "Image macro");
  const tags = input.tags?.filter(Boolean) ?? [];
  const copyrightStatus: CopyrightStatus = input.copyrightStatus || "attributed_fair_use";

  const lines: string[] = [];
  lines.push("  {");
  lines.push(`    id: ${JSON.stringify(id)},`);
  lines.push(`    title: ${JSON.stringify(input.title)},`);
  lines.push(`    slug: ${JSON.stringify(slug)},`);
  lines.push(`    description:\n      ${JSON.stringify(description)},`);
  lines.push(`    explanation:\n      ${JSON.stringify(explanation)},`);
  lines.push(`    imageUrl: ${JSON.stringify(input.imageUrl)},`);
  lines.push(`    uploadedMediaKind: ${JSON.stringify(input.uploadedMediaKind)},`);
  lines.push(`    imagePlaceholderLabel: ${JSON.stringify(input.title)},`);
  lines.push(`    placeholderTone: "saffron",`);
  lines.push(`    sourceUrl: ${JSON.stringify(input.sourceUrl)},`);
  lines.push(`    sourcePlatform: ${JSON.stringify(input.sourcePlatform)},`);
  if (input.creator?.trim()) lines.push(`    creator: ${JSON.stringify(input.creator.trim())},`);
  lines.push(`    language: ${JSON.stringify(input.language)},`);
  lines.push(`    region: ${JSON.stringify(input.region)},`);
  lines.push(`    category: ${JSON.stringify(input.category)},`);
  lines.push(`    contentType: ${JSON.stringify(contentType)},`);
  lines.push(`    tags: ${JSON.stringify(tags)},`);
  lines.push(`    originDate: ${JSON.stringify(originDate)},`);
  lines.push(`    originStory:\n      ${JSON.stringify(originStory)},`);
  lines.push(`    culturalContext:\n      ${JSON.stringify(culturalContext)},`);
  lines.push(`    variations: [],`);
  lines.push(`    relatedSlugs: [],`);
  lines.push(`    popularityScore: 20,`);
  lines.push(`    growth24h: 0,`);
  lines.push(`    shareCount: 0,`);
  lines.push(`    explainViewCount: 0,`);
  lines.push(`    status: "published",`);
  lines.push(`    copyrightStatus: ${JSON.stringify(copyrightStatus)},`);
  lines.push("  },");
  return lines.join("\n");
}

/** Splices one or more serialized entries into data.ts right before the languageInfo marker. */
export function insertMemeEntries(dataTsContent: string, entryBlocks: string[]): string {
  const idx = dataTsContent.indexOf(DATA_MARKER);
  if (idx === -1) throw new Error("Could not find insertion marker in data.ts");
  const insertion = entryBlocks.join("\n") + "\n";
  return dataTsContent.slice(0, idx) + insertion + dataTsContent.slice(idx);
}
