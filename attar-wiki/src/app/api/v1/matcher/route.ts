import { apiError, json, parseBody, publicClient } from "@/lib/api/http";
import { MatcherInput, runMatcher } from "@/lib/matcher";

// Best-effort per-instance rate limit to protect the Claude API budget.
const hits = new Map<string, { n: number; reset: number }>();
const LIMIT = 10;
const WINDOW_MS = 60_000;

function limited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { n: 1, reset: now + WINDOW_MS });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  entry.n += 1;
  return entry.n > LIMIT;
}

/** POST {occasion?, weather, vibes[], budget} → up to 6 attars that exist in the wiki. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return apiError(429, "Too many requests, try again in a minute");
  const body = await parseBody(req, MatcherInput);
  if (body instanceof Response) return body;
  const supabase = await publicClient();
  if (!supabase) return json({ method: "rules", results: [] });
  const result = await runMatcher(supabase, body);
  return json(result, { cache: "no-store" });
}
