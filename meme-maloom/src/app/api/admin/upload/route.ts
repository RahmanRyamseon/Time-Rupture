import { NextResponse } from "next/server";
import { LANGUAGES, REGIONS, CATEGORIES } from "@/lib/types";
import {
  existingSlugs,
  insertMemeEntries,
  nextMemeId,
  serializeMemeEntry,
  uniqueSlug,
  type NewMemeInput,
} from "@/lib/build-meme-entry";
import { commitFiles, getFileContent } from "@/lib/github-commit";

export const runtime = "nodejs";

// Matches Vercel's default serverless request-body limit — kept explicit so
// a too-large upload fails with a clear message instead of a raw 413.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const DATA_TS_PATH = "meme-maloom/src/lib/data.ts";
const UPLOADS_DIR = "meme-maloom/public/uploads";

type ItemMeta = {
  title: string;
  description?: string;
  explanation?: string;
  sourceUrl: string;
  sourcePlatform: string;
  creator?: string;
  language: string;
  region: string;
  category: string;
  originDate?: string;
  originStory?: string;
  culturalContext?: string;
  tags?: string;
  fileKey: string;
};

function detectMediaKind(mimeType: string): "image" | "video" | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

function safeExtension(filename: string, fallback: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return (match?.[1] || fallback).toLowerCase();
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const itemsRaw = form.get("items");
  if (typeof itemsRaw !== "string") {
    return NextResponse.json({ error: "Missing item metadata." }, { status: 400 });
  }

  let items: ItemMeta[];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return NextResponse.json({ error: "Item metadata was not valid JSON." }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items to upload." }, { status: 400 });
  }

  // Validate every item before touching GitHub, so a bad item in a bulk
  // batch fails loudly up front rather than leaving a half-done commit.
  const errors: string[] = [];
  const files: { meta: ItemMeta; file: File }[] = [];
  for (const item of items) {
    const label = item.title || item.fileKey;
    if (!item.title?.trim()) errors.push(`${label}: title is required`);
    if (!item.sourceUrl?.trim()) errors.push(`${label}: source URL is required`);
    if (!item.sourcePlatform?.trim()) errors.push(`${label}: source platform is required`);
    if (!LANGUAGES.includes(item.language as (typeof LANGUAGES)[number])) errors.push(`${label}: invalid language`);
    if (!REGIONS.includes(item.region as (typeof REGIONS)[number])) errors.push(`${label}: invalid region`);
    if (!CATEGORIES.includes(item.category as (typeof CATEGORIES)[number])) errors.push(`${label}: invalid category`);

    const file = form.get(item.fileKey);
    if (!(file instanceof File)) {
      errors.push(`${label}: file missing`);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`${label}: file is ${(file.size / 1024 / 1024).toFixed(1)}MB, over the ${MAX_FILE_BYTES / 1024 / 1024}MB limit`);
      continue;
    }
    if (!detectMediaKind(file.type)) {
      errors.push(`${label}: "${file.type || "unknown type"}" isn't a recognised image or video format`);
      continue;
    }
    files.push({ meta: item, file });
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Fix these and try again:", details: errors }, { status: 400 });
  }

  try {
    const { content: currentDataTs } = await getFileContent(DATA_TS_PATH);

    const slugs = existingSlugs(currentDataTs);
    let idCounter = parseInt(nextMemeId(currentDataTs).slice(1), 10);

    const entryBlocks: string[] = [];
    const added: { title: string; slug: string }[] = [];
    const fileWrites: { path: string; content: Buffer }[] = [];

    for (const { meta, file } of files) {
      const mediaKind = detectMediaKind(file.type) as "image" | "video";
      const id = `m${idCounter++}`;
      const slug = uniqueSlug(meta.title, slugs);
      slugs.add(slug);

      const ext = safeExtension(file.name, mediaKind === "video" ? "mp4" : "jpg");
      const filename = `${slug}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      fileWrites.push({ path: `${UPLOADS_DIR}/${filename}`, content: buffer });

      const input: NewMemeInput = {
        title: meta.title.trim(),
        description: meta.description,
        explanation: meta.explanation,
        sourceUrl: meta.sourceUrl.trim(),
        sourcePlatform: meta.sourcePlatform.trim(),
        creator: meta.creator,
        language: meta.language as NewMemeInput["language"],
        region: meta.region as NewMemeInput["region"],
        category: meta.category as NewMemeInput["category"],
        originDate: meta.originDate,
        originStory: meta.originStory,
        culturalContext: meta.culturalContext,
        tags: meta.tags?.split(",").map((t) => t.trim()).filter(Boolean),
        uploadedMediaKind: mediaKind,
        imageUrl: `/uploads/${filename}`,
      };

      entryBlocks.push(serializeMemeEntry(input, id, slug));
      added.push({ title: input.title, slug });
    }

    const updatedDataTs = insertMemeEntries(currentDataTs, entryBlocks);

    const commitMessage =
      added.length === 1
        ? `Admin upload: add "${added[0].title}"`
        : `Admin upload: add ${added.length} memes via admin tool`;

    const { htmlUrl } = await commitFiles(
      [{ path: DATA_TS_PATH, content: updatedDataTs }, ...fileWrites],
      commitMessage
    );

    return NextResponse.json({ ok: true, added, commitUrl: htmlUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
