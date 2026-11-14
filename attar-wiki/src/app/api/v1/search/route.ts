import type { NextRequest } from "next/server";
import { search } from "@/lib/data/wiki";
import { json, PUBLIC_CACHE } from "@/lib/api/http";
import type { EntityType } from "@/lib/types";

const TYPES: EntityType[] = ["attar", "house", "note", "region", "glossary", "guide"];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const types = (req.nextUrl.searchParams.get("type") ?? "")
    .split(",")
    .filter((t): t is EntityType => TYPES.includes(t as EntityType));
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 20, 50);
  const results = await search(q, types, limit);
  return json({ query: q, results }, { cache: PUBLIC_CACHE });
}
