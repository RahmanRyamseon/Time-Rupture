import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Content, Locale, Product } from "./types";
import type { VoteSummary } from "./votes";

export const MatcherInput = z.object({
  occasion: z.string().max(40).optional().default(""),
  season: z.string().max(40).optional().default(""),
  character: z.string().max(40).optional().default(""),
  strength: z.string().max(2).optional().default(""),
  locale: z.enum(["ar", "en"]).default("ar"),
});
export type MatcherInput = z.infer<typeof MatcherInput>;

export type MatchResult = { id: string; reason: string };
export type MatcherResponse = { mode: "ai" | "rules"; results: MatchResult[] };

/**
 * Character tags derived only from documented data: note families, plus
 * the origin descriptions cited on the origin pages (e.g. Hindi → animalic, smoky).
 */
const ORIGIN_CHARACTER: Record<string, string[]> = {
  hindi: ["animalic", "smoky", "woody"],
  cambodi: ["sweet", "woody"],
  malaysian: ["smoky", "earthy", "woody"],
  indonesian: ["woody", "earthy"],
  vietnamese: ["woody"],
  laotian: ["animalic", "sweet"],
};

export function characterOf(c: Content, p: Product): Set<string> {
  const out = new Set<string>();
  for (const r of [...p.notes.top, ...p.notes.heart, ...p.notes.base]) {
    const fam = c.notes.find((n) => n.id === r.note)?.family;
    if (fam) out.add(fam);
  }
  for (const o of p.origins) for (const ch of ORIGIN_CHARACTER[o] ?? []) out.add(ch);
  if (p.category === "bakhoor" || p.category === "oud-wood") out.add("smoky");
  return out;
}

function name(c: Content, type: string, id: string, l: Locale) {
  return c.taxonomy[type]?.find((x) => x.id === id)?.name[l] ?? id;
}

/** Deterministic scoring used on its own and as the fallback for the AI path. */
export function ruleMatch(c: Content, input: MatcherInput, votes: Map<string, VoteSummary>, limit = 5): MatchResult[] {
  const l = input.locale;
  const scored = c.products.map((p) => {
    let s = 0;
    const why: string[] = [];
    if (input.occasion) {
      if (p.occasions.includes(input.occasion)) { s += 3; why.push(l === "ar" ? `موثّق لمناسبة «${name(c, "occasion", input.occasion, l)}»` : `documented for ${name(c, "occasion", input.occasion, l)}`); }
    }
    if (input.season) {
      if (p.seasons.includes(input.season) || p.seasons.includes("all")) { s += 2; why.push(l === "ar" ? (p.seasons.includes("all") ? "تذكر الدار أنه لكل المواسم" : `موثّق لموسم «${name(c, "season", input.season, l)}»`) : (p.seasons.includes("all") ? "the house says it suits all seasons" : `documented for ${name(c, "season", input.season, l)}`)); }
    }
    if (input.character) {
      if (characterOf(c, p).has(input.character)) { s += 3; why.push(l === "ar" ? `طابعه ${name(c, "character", input.character, l)} بحسب نفحاته أو منشئه الموثّق` : `${name(c, "character", input.character, l).toLowerCase()} character from its documented notes or origin`); }
    }
    if (input.strength) {
      const v = votes.get(p.id)?.strength;
      if (v && Math.round(v) === Number(input.strength)) { s += 2; why.push(l === "ar" ? "قوته تطابق تصويت المجتمع" : "strength matches community votes"); }
    }
    return { p, s, why };
  });
  const any = input.occasion || input.season || input.character || input.strength;
  return scored
    .filter((x) => (any ? x.s > 0 : true))
    .sort((a, b) => b.s - a.s || a.p.id.localeCompare(b.p.id))
    .slice(0, limit)
    .map((x) => ({ id: x.p.id, reason: x.why.join(l === "ar" ? "؛ " : "; ") || (l === "ar" ? "من مداخل الموسوعة" : "an entry in the encyclopedia") }));
}

const AiSchema = z.object({
  results: z.array(z.object({ id: z.string(), reason: z.string() })).max(5),
});

/** Asks Claude to rank ONLY the supplied candidates; every returned id is verified. */
export async function aiMatch(c: Content, input: MatcherInput, votes: Map<string, VoteSummary>): Promise<MatchResult[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const l = input.locale;
  const candidates = c.products.slice(0, 40).map((p) => ({
    id: p.id,
    name: p.name[l],
    house: c.houses.find((h) => h.id === p.houseId)?.name[l],
    category: name(c, "category", p.category, l),
    origins: p.origins.map((o) => name(c, "origin_group", o, l)),
    notes: [...p.notes.top, ...p.notes.heart, ...p.notes.base].map((r) => c.notes.find((n) => n.id === r.note)?.name[l]),
    character: [...characterOf(c, p)].map((ch) => name(c, "character", ch, l)),
    occasions: p.occasions.map((o) => name(c, "occasion", o, l)),
    seasons: p.seasons.map((o) => name(c, "season", o, l)),
    community_strength: votes.get(p.id)?.strength ?? null,
    description: p.description[l],
  }));
  const prefs = {
    occasion: input.occasion ? name(c, "occasion", input.occasion, l) : null,
    season: input.season ? name(c, "season", input.season, l) : null,
    character: input.character ? name(c, "character", input.character, l) : null,
    strength: input.strength ? name(c, "strength", input.strength, l) : null,
  };
  const system = l === "ar"
    ? "أنت مرشد في موسوعة عربية عن العود والطيب. رتّب حتى خمسة منتجات من قائمة المرشحين فقط بحسب تفضيلات القارئ. لا تخترع منتجات أو معلومات: استخدم فقط الحقول المعطاة، ولا تذكر أسعاراً أو ادعاءات أصالة. اكتب لكل منتج سبباً موجزاً بالعربية الفصحى (جملة واحدة) يستند إلى الحقول. إذا لم يناسب أي مرشح، أعد قائمة فارغة."
    : "You are the matcher of an encyclopedia of oud and attar. Rank up to five products from the candidate list only, according to the reader's preferences. Never invent products or facts: use only the given fields, and never mention prices or authenticity. Give each product one short reason in English grounded in the fields. If nothing fits, return an empty list.";
  try {
    const client = new Anthropic();
    const res = await client.messages.parse({
      model: process.env.MATCHER_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(AiSchema) },
      system,
      messages: [{ role: "user", content: JSON.stringify({ preferences: prefs, candidates }) }],
    }, { timeout: 25_000, maxRetries: 1 });
    if (res.stop_reason === "refusal" || !res.parsed_output) return null;
    const known = new Set(candidates.map((x) => x.id));
    const seen = new Set<string>();
    const verified = res.parsed_output.results.filter((r) => known.has(r.id) && !seen.has(r.id) && seen.add(r.id) && r.reason.length < 400);
    // If the model returned anything unknown, distrust the whole answer and use rules.
    if (verified.length !== res.parsed_output.results.length) return null;
    return verified;
  } catch (e) {
    console.error("matcher AI failed; using rules", e instanceof Error ? e.message : e);
    return null;
  }
}
