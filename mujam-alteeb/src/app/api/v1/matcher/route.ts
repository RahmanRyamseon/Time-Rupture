import { NextResponse } from "next/server";
import { getContent } from "@/lib/content";
import { aiMatch, MatcherInput, ruleMatch, type MatcherResponse } from "@/lib/matcher";
import { getVoteSummaries } from "@/lib/votes";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  const parsed = MatcherInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid input", issues: parsed.error.issues }, { status: 400 });
  const input = parsed.data;
  const c = await getContent();
  const votes = await getVoteSummaries();
  // Reject unknown taxonomy ids up front.
  const ok = (type: string, id: string) => !id || (c.taxonomy[type] ?? []).some((x) => x.id === id);
  if (!ok("occasion", input.occasion) || !ok("season", input.season) || !ok("character", input.character) || !ok("strength", input.strength)) {
    return NextResponse.json({ error: "unknown option" }, { status: 400 });
  }
  const ai = await aiMatch(c, input, votes);
  const out: MatcherResponse = ai && ai.length ? { mode: "ai", results: ai } : { mode: "rules", results: ruleMatch(c, input, votes) };
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
