import { NextResponse } from "next/server";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function json(data: unknown, init: { status?: number; cache?: string } = {}) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { ...CORS, "Cache-Control": init.cache ?? "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
