import "server-only";
import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from "./supabase/config";

export type VoteSummary = { product_id: string; votes: number; strength: number | null; longevity: number | null; sillage: number | null };
export const MIN_VOTES = 5;

/** Community vote averages (only products past the minimum vote count). Empty when Supabase is off. */
export async function getVoteSummaries(): Promise<Map<string, VoteSummary>> {
  const out = new Map<string, VoteSummary>();
  if (!supabaseConfigured) return out;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/vote_summary?select=product_id,votes,strength,longevity,sillage&votes=gte.${MIN_VOTES}`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
      next: { revalidate: 600 },
    });
    if (res.ok) for (const r of (await res.json()) as VoteSummary[]) out.set(r.product_id, r);
  } catch { /* offline or not provisioned: no community data */ }
  return out;
}
