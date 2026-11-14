// Run with: npm test   (node:test + tsx, react-server condition so "server-only" imports resolve)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFootnotes } from "../src/lib/citations";
import { slugify } from "../src/lib/sections";
import { MatcherInput, scoreRow, type CatalogRow } from "../src/lib/matcher";
import type { Citation } from "../src/lib/types";

const cite = (field: string, url: string, sort = 0): Citation => ({
  id: url + field,
  entity_type: "attar",
  entity_id: "x",
  field_name: field,
  url,
  title: url,
  publisher: null,
  accessed_at: "2026-01-01",
  sort_order: sort,
});

test("footnotes are numbered by field order and de-duplicated by URL", () => {
  const f = buildFootnotes([cite("how_made", "https://b"), cite("base_oil", "https://a"), cite("notes", "https://a")], ["base_oil", "how_made", "notes"]);
  assert.deepEqual(f.list.map((c) => c.url), ["https://a", "https://b"]);
  assert.deepEqual(f.byField, { base_oil: [1], how_made: [2], notes: [1] });
});

test("slugify handles accents, spaces and symbols", () => {
  assert.equal(slugify("  Rūh Gulāb — Kannauj! "), "ruh-gulab-kannauj");
  assert.equal(slugify("Mitti/Attar 2"), "mitti-attar-2");
});

const row = (over: Partial<CatalogRow>): CatalogRow => ({
  id: "1",
  slug: "a",
  name: "A",
  house: null,
  attar_type: null,
  scent_family: null,
  base_oil: null,
  occasions: [],
  notes: [],
  stats: {},
  per10_min: null,
  per10_max: null,
  ...over,
});

test("matcher scores from catalog fields and reports factual reasons", () => {
  const input = MatcherInput.parse({ occasion: "wedding", weather: "heat", vibes: ["earthy"], budget: "low" });
  const good = scoreRow(
    row({
      scent_family: "Earthy",
      occasions: ["Weddings"],
      notes: ["vetiver|vetiver"],
      stats: { heat: { avg: 4.5, n: 10 } },
      per10_min: 200,
      per10_max: 400,
    }),
    input,
  );
  const poor = scoreRow(row({ scent_family: "Sweet", stats: { heat: { avg: 1.5, n: 10 } }, per10_min: 3000, per10_max: 5000 }), input);
  assert.ok(good.score > poor.score);
  const kinds = good.reasons.map((r) => r.kind).sort();
  assert.deepEqual(kinds, ["budget", "family", "note", "occasion", "weather"]);
  assert.equal(poor.reasons.length, 0);
});

test("matcher ignores weather votes below 3.5 for reasons and caps vibe count", () => {
  const input = MatcherInput.parse({ weather: "humidity", vibes: ["fresh"] });
  const r = scoreRow(row({ stats: { humidity: { avg: 3.0, n: 4 } } }), input);
  assert.equal(r.reasons.length, 0);
  assert.throws(() => MatcherInput.parse({ vibes: ["fresh", "floral", "earthy", "woody"] }));
});
