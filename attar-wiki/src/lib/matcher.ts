import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------------ */
/* Inputs                                                                    */
/* ------------------------------------------------------------------------ */

export const OCCASIONS = ["daily", "office", "evening", "wedding", "prayer", "date", "sleep"] as const;
export const WEATHERS = ["heat", "humidity", "winter", "any"] as const;
export const VIBES = ["fresh", "floral", "earthy", "woody", "spicy", "sweet", "smoky", "green"] as const;
export const BUDGETS = ["any", "low", "mid", "high"] as const;

export const MatcherInput = z.object({
  occasion: z.enum(OCCASIONS).optional(),
  weather: z.enum(WEATHERS).default("any"),
  vibes: z.array(z.enum(VIBES)).max(3).default([]),
  budget: z.enum(BUDGETS).default("any"),
});
export type MatcherInputT = z.infer<typeof MatcherInput>;

/*
 * Keyword maps used ONLY to score catalog fields against the reader's answers.
 * They never produce text shown to readers: reasons shown are the attar's own
 * documented fields (its family, notes, occasions, votes, reported price).
 */
const OCCASION_WORDS: Record<(typeof OCCASIONS)[number], string[]> = {
  daily: ["daily", "everyday", "casual", "day"],
  office: ["office", "work", "daily", "professional"],
  evening: ["evening", "night", "party", "mehfil"],
  wedding: ["wedding", "shaadi", "festive", "festival", "celebration", "eid", "diwali"],
  prayer: ["prayer", "namaz", "puja", "worship", "religious", "jumma", "masjid", "temple"],
  date: ["date", "romantic", "evening", "night"],
  sleep: ["sleep", "bedtime", "relax", "calm"],
};

const VIBE_WORDS: Record<(typeof VIBES)[number], string[]> = {
  fresh: ["fresh", "citrus", "aquatic", "cool", "mint", "lemon", "bergamot", "khus", "vetiver", "kewda"],
  floral: ["floral", "flower", "rose", "gulab", "jasmine", "mogra", "motia", "chameli", "champa", "kewda", "tuberose", "rajnigandha", "hina"],
  earthy: ["earthy", "mitti", "soil", "petrichor", "vetiver", "khus", "patchouli"],
  woody: ["woody", "wood", "sandal", "chandan", "oud", "agarwood", "cedar"],
  spicy: ["spicy", "spice", "saffron", "kesar", "clove", "cardamom", "elaichi", "cinnamon", "hina", "warm"],
  sweet: ["sweet", "amber", "ambery", "vanilla", "musk", "gourmand", "honey", "shamama"],
  smoky: ["smoky", "smoke", "resin", "resinous", "oud", "incense", "loban", "frankincense", "leather", "shamama"],
  green: ["green", "herbal", "leaf", "grass", "tulsi", "basil", "tea"],
};

const BUDGET_BANDS: Record<(typeof BUDGETS)[number], [number, number]> = {
  any: [0, Infinity],
  low: [0, 500],
  mid: [500, 2000],
  high: [2000, Infinity],
};

/* ------------------------------------------------------------------------ */
/* Catalog & rule-based scoring                                              */
/* ------------------------------------------------------------------------ */

export interface CatalogRow {
  id: string;
  slug: string;
  name: string;
  house: string | null;
  attar_type: string | null;
  scent_family: string | null;
  base_oil: string | null;
  occasions: string[];
  notes: string[]; // "name|slug"
  stats: Record<string, { avg: number; n: number }>;
  per10_min: number | null;
  per10_max: number | null;
}

export type Reason =
  | { kind: "occasion" }
  | { kind: "weather"; metric: string; avg: number; count: number }
  | { kind: "family"; family: string }
  | { kind: "note"; note: string }
  | { kind: "budget"; min: number; max: number }
  | { kind: "longevity"; avg: number; count: number };

interface Scored {
  row: CatalogRow;
  score: number;
  reasons: Reason[];
}

const words = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function scoreRow(row: CatalogRow, input: MatcherInputT): Scored {
  let score = 0;
  const reasons: Reason[] = [];

  if (input.occasion) {
    const occ = row.occasions.map((o) => o.toLowerCase());
    if (OCCASION_WORDS[input.occasion].some((w) => occ.some((o) => o.includes(w)))) {
      score += 3;
      reasons.push({ kind: "occasion" });
    }
  }

  if (input.weather !== "any") {
    const s = row.stats[input.weather];
    if (s && s.n > 0) {
      const confidence = Math.min(1, s.n / 5);
      score += (Number(s.avg) - 3) * 1.5 * confidence;
      if (Number(s.avg) >= 3.5) reasons.push({ kind: "weather", metric: input.weather, avg: Number(s.avg), count: s.n });
    }
  }

  const family = words(row.scent_family);
  const notes = row.notes.map((n) => n.split("|")[0]);
  for (const vibe of input.vibes) {
    const kw = VIBE_WORDS[vibe];
    if (family && kw.some((w) => family.includes(w))) {
      score += 2;
      if (!reasons.some((r) => r.kind === "family")) reasons.push({ kind: "family", family: row.scent_family! });
    }
    const hit = notes.filter((n) => kw.some((w) => n.includes(w))).slice(0, 2);
    for (const n of hit) {
      score += 1;
      if (!reasons.some((r) => r.kind === "note" && r.note === n)) reasons.push({ kind: "note", note: n });
    }
  }

  if (input.budget !== "any") {
    const [lo, hi] = BUDGET_BANDS[input.budget];
    if (row.per10_min != null && row.per10_max != null) {
      if (Number(row.per10_max) >= lo && Number(row.per10_min) <= hi) {
        score += 1;
        reasons.push({ kind: "budget", min: Number(row.per10_min), max: Number(row.per10_max) });
      } else score -= 2;
    }
  }

  const lon = row.stats.longevity;
  if (lon && lon.n > 0) {
    score += (Number(lon.avg) - 3) * 0.3 * Math.min(1, lon.n / 5);
    if (Number(lon.avg) >= 4 && lon.n >= 3) reasons.push({ kind: "longevity", avg: Number(lon.avg), count: lon.n });
  }

  return { row, score, reasons };
}

/* ------------------------------------------------------------------------ */
/* Claude re-ranking (catalog data only; ids are verified)                   */
/* ------------------------------------------------------------------------ */

const RerankSchema = z.object({
  ranked_ids: z.array(z.string()).max(6),
});

async function rerankWithClaude(candidates: Scored[], input: MatcherInputT): Promise<string[] | null> {
  if (!process.env.ANTHROPIC_API_KEY || candidates.length < 2) return null;
  const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
  const catalog = candidates.map(({ row }) => ({
    id: row.id,
    name: row.name,
    house: row.house,
    type: row.attar_type,
    family: row.scent_family,
    base_oil: row.base_oil,
    occasions: row.occasions,
    notes: row.notes.map((n) => n.split("|")[0]),
    votes: row.stats,
    inr_per_10ml: row.per10_min != null ? [Number(row.per10_min), Number(row.per10_max)] : null,
  }));

  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(RerankSchema) },
      system:
        "You rank attars (Indian perfume oils) from a provided catalog for a reader's preferences. " +
        "Use ONLY the catalog data given. Never invent attars, notes or facts. " +
        "Return up to 6 ids copied exactly from the catalog, best match first. " +
        "Weigh community votes more when they have more votes. If nothing fits, return an empty list.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({ preferences: input, catalog }),
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;
    return response.parsed_output.ranked_ids;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.warn("matcher: Claude unavailable, using rules", err.status);
    else console.warn("matcher: Claude call failed, using rules");
    return null;
  }
}

/* ------------------------------------------------------------------------ */
/* Entry point                                                               */
/* ------------------------------------------------------------------------ */

export interface MatchResult {
  id: string;
  slug: string;
  name: string;
  house: string | null;
  reasons: Reason[];
}

export async function runMatcher(supabase: SupabaseClient, input: MatcherInputT): Promise<{ method: "ai" | "rules"; results: MatchResult[] }> {
  const { data, error } = await supabase.rpc("matcher_catalog").limit(3000);
  if (error || !data) return { method: "rules", results: [] };
  const rows = data as CatalogRow[];

  const scored = rows.map((r) => scoreRow(r, input)).sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));
  const anySignal = input.occasion || input.weather !== "any" || input.vibes.length || input.budget !== "any";
  const relevant = anySignal ? scored.filter((s) => s.score > 0 && s.reasons.length > 0) : scored;
  const candidates = relevant.slice(0, 60);
  if (candidates.length === 0) return { method: "rules", results: [] };

  const byId = new Map(candidates.map((c) => [c.row.id, c]));
  const aiIds = await rerankWithClaude(candidates, input);
  // Verify: keep only ids that exist in the candidate set (and thus the database), no duplicates.
  const verified = [...new Set(aiIds ?? [])].filter((id) => byId.has(id));

  const pickList = verified.length > 0 ? verified.map((id) => byId.get(id)!) : candidates.slice(0, 6);
  return {
    method: verified.length > 0 ? "ai" : "rules",
    results: pickList.slice(0, 6).map(({ row, reasons }) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      house: row.house,
      reasons,
    })),
  };
}
