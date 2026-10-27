import { NextResponse } from "next/server";

// Served dynamically so it's always in sync with whatever publisher ID is
// actually configured — empty (but still a valid, empty ads.txt) until
// NEXT_PUBLIC_ADSENSE_CLIENT_ID is set, so AdSense's crawler never finds a
// stale or placeholder entry.
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const pubId = clientId?.replace(/^ca-/, "");

  const body = pubId ? `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n` : "";

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
