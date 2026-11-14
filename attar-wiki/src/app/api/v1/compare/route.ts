import type { NextRequest } from "next/server";
import { getCompareData } from "@/lib/data/wiki";
import { json, PUBLIC_CACHE } from "@/lib/api/http";

export async function GET(req: NextRequest) {
  const items = (req.nextUrl.searchParams.get("items") ?? "").split(",");
  return json({ items: await getCompareData(items) }, { cache: PUBLIC_CACHE });
}
