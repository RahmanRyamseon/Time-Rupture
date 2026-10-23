import { supabase } from "./supabase/browserClient";
import { opportunities as sampleOpportunities } from "./data/opportunities";
import { Opportunity } from "./types";

/**
 * Data-access layer for opportunities. Prefers the live Supabase table (kept
 * current by the daily source-check job — see supabase/functions/daily-source-check
 * and the README's "Keeping this current" section); falls back to the bundled
 * sample data when Supabase isn't configured (e.g. local dev without a .env.local),
 * so the site still runs. Every column in the `opportunities` table mirrors the
 * Opportunity type 1:1, so rows need no reshaping beyond the Supabase client's
 * own JSON parsing.
 */

let cache: { data: Opportunity[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getAllOpportunities(): Promise<Opportunity[]> {
  if (!supabase) return sampleOpportunities;

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const { data, error } = await supabase.from("opportunities").select("*").order("id");

    if (error || !data || data.length === 0) {
      if (error) console.error("Supabase opportunities fetch failed, using sample data:", error.message);
      return sampleOpportunities;
    }

    const rows = data as Opportunity[];
    cache = { data: rows, fetchedAt: Date.now() };
    return rows;
  } catch (err) {
    // Network-level failures (DNS, TLS, blocked egress) throw rather than
    // returning { error } — catch those too so the site still runs.
    console.error("Supabase opportunities fetch threw, using sample data:", err instanceof Error ? err.message : err);
    return sampleOpportunities;
  }
}

export async function getOpportunityById(id: string): Promise<Opportunity | undefined> {
  const all = await getAllOpportunities();
  return all.find((o) => o.id === id);
}
