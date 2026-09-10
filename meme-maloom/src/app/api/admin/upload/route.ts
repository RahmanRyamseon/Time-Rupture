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

// Magic-number signatures for the formats we accept. The browser-supplied
// `file.type` is attacker-controlled, so before trusting a file as
// "image"/"video" we confirm its actual bytes match a known format —
// otherwise e.g. an SVG-with-script could be uploaded mislabeled as
// image/png and later served as active content.
const IMAGE_SIGNATURES: { bytes: number[]; offset?: number }[] = [
  { bytes: [0xff, 0xd8, 0xff] }, // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // PNG
  { bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (WEBP container, checked further below)
];
const VIDEO_SIGNATURES: { bytes: number[]; offset?: number }[] = [
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // 'ftyp' box: MP4/MOV/QuickTime
  { bytes: [0x1a, 0x45, 0xdf, 0xa3] }, // WEBM/Matroska EBML header
];

function matchesSignature(buffer: Buffer, sig: { bytes: number[]; offset?: number }): boolean {
  const offset = sig.offset ?? 0;
  if (buffer.length < offset + sig.bytes.length) return false;
  return sig.bytes.every((byte, i) => buffer[offset + i] === byte);
}

function sniffMediaKind(buffer: Buffer): "image" | "video" | null {
  if (matchesSignature(buffer, { bytes: [0x52, 0x49, 0x46, 0x46] })) {
    // RIFF container — only WEBP counts as image; check the "WEBP" tag at offset 8.
    const isWebp = buffer.length >= 12 && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (isWebp) return "image";
  }
  if (IMAGE_SIGNATURES.slice(0, 3).some((sig) => matchesSignature(buffer, sig))) return "image";
  if (VIDEO_SIGNATURES.some((sig) => matchesSignature(buffer, sig))) return "video";
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
  const files: { meta: ItemMeta; file: File; buffer: Buffer; mediaKind: "image" | "video" }[] = [];
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
    const declaredKind = detectMediaKind(file.type);
    if (!declaredKind) {
      errors.push(`${label}: "${file.type || "unknown type"}" isn't a recognised image or video format`);
      continue;
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const actualKind = sniffMediaKind(buffer);
    if (!actualKind || actualKind !== declaredKind) {
      errors.push(`${label}: file content doesn't match a valid ${declaredKind} format`);
      continue;
    }
    files.push({ meta: item, file, buffer, mediaKind: actualKind });
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

    for (const { meta, file, buffer, mediaKind } of files) {
      const id = `m${idCounter++}`;
      const slug = uniqueSlug(meta.title, slugs);
      slugs.add(slug);

      const ext = safeExtension(file.name, mediaKind === "video" ? "mp4" : "jpg");
      const filename = `${slug}.${ext}`;
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
    // Log the real error server-side only — the client never sees GitHub API
    // internals (status codes, response bodies) that this could otherwise leak.
    console.error("Admin upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Check the server logs for details." },
      { status: 500 }
    );
  }
}
