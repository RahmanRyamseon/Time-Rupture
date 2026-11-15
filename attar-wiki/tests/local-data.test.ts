// Tests for the database-free data source that serves the cited seed bundle.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as local from "../src/lib/data/local";

const top = (q: string, type?: Parameters<typeof local.search>[1]) => local.search(q, type, 5)[0]?.slug;

test("search handles attar/itr/ittar spellings, Hindi and typos", () => {
  assert.equal(top("ittar khus"), "ruh-khus");
  assert.equal(top("itr mitti"), "mitti-attar");
  assert.equal(top("खस", ["note"]), "vetiver");
  assert.equal(top("कन्नौज"), "kannauj");
  assert.equal(top("kanauj"), "kannauj");
  assert.equal(top("shamam"), "shamama");
  assert.equal(top("kevda attar"), "kewda-attar");
  assert.equal(top("deg bhapka"), "deg-bhapka");
  assert.deepEqual(local.search("zzzzqqq"), []);
});

test("every attar page resolves with notes and citations; no uncited factual fields", () => {
  for (const a of local.listSection("attars") as { slug: string }[]) {
    const d = local.getAttar(a.slug)!;
    assert.ok(d, a.slug);
    assert.deepEqual(d.missingCitations, [], `${a.slug} has uncited fields: ${d.missingCitations}`);
  }
  for (const [section, get] of [
    ["houses", local.getHouse],
    ["notes", local.getNote],
    ["regions", local.getRegion],
    ["glossary", local.getGlossaryEntry],
    ["guides", local.getGuide],
  ] as const) {
    for (const r of local.listSection(section) as { slug: string }[]) {
      const d = get(r.slug)!;
      assert.deepEqual(d.missingCitations, [], `${section}/${r.slug} uncited: ${d.missingCitations}`);
    }
  }
});

test("browse filters and the note explorer", () => {
  assert.equal(local.browseAttars({ region: "kannauj" }).total >= 3, true);
  assert.deepEqual(
    local.browseAttars({ note: "baked-earth" }).rows.map((r) => r.slug).sort(),
    ["ka-mitti-attar", "mitti-attar", "mlr-attar-mitti"],
  );
  assert.equal(local.browseAttars({ weather: "heat" }).total, 0, "weather needs real votes");
  const rose = local.getNote("rose")!;
  assert.ok(rose.byPosition.heart.some((a) => a.slug === "ruh-gulab"));
  assert.ok(local.getHouse("nizam-attar")!.attars.some((a) => a.slug === "nizam-durbar"));
});

test("matcher uses documented seasons when there are no votes yet", async () => {
  const { runMatcher, MatcherInput } = await import("../src/lib/matcher");
  const summer = await runMatcher(null, MatcherInput.parse({ weather: "heat", vibes: ["earthy"] }), local.matcherCatalog);
  assert.equal(summer.method, "rules");
  assert.ok(summer.results.length > 0);
  assert.ok(summer.results.some((r) => r.slug === "ruh-khus"));
  const winter = await runMatcher(null, MatcherInput.parse({ weather: "winter" }), local.matcherCatalog);
  assert.ok(winter.results.every((r) => r.reasons.some((x) => x.kind === "season")));
  assert.ok(winter.results.some((r) => r.slug.includes("shamama")));
});

test("house products: style links, listed notes, units and prices are consistent", () => {
  const style = local.getAttar("mitti-attar")!;
  const versions = style.reverseRelations.filter((r) => r.relation === "example_of").map((r) => r.related!.slug).sort();
  assert.deepEqual(versions, ["ka-mitti-attar", "mlr-attar-mitti"]);
  const mlr = local.getAttar("mlr-attar-mitti")!;
  assert.equal(mlr.house?.slug, "ml-ramnarain");
  assert.ok(mlr.notes.every((n) => n.position === "listed"), "brand gave no positions");
  assert.deepEqual(mlr.prices.map((p) => [p.volume_ml, p.unit, p.price_min_inr]).sort(), [[10, "g", 6000], [2.5, "g", 1500]].sort());
  const aj = local.getAttar("ajmal-zabeel")!;
  assert.equal(aj.prices[0].unit, "ml");
  assert.ok(aj.notes.some((n) => n.position === "base" && n.note.slug === "amber"));
  // Kannauj Attar prices are intentionally not recorded (no size per price in the store data)
  assert.equal(local.getAttar("ka-mitti-attar")!.prices.length, 0);
  // every product has a house and its description is cited
  for (const a of local.listSection("attars") as { slug: string; house: unknown }[]) {
    const d = local.getAttar(a.slug)!;
    if (d.house) assert.ok(d.citations.some((c) => c.field_name === "description"), a.slug);
  }
  assert.ok(local.search("ajmal musk").some((h) => h.slug.startsWith("ajmal-")));
  assert.equal(local.getHouse("kannauj-attar")!.attars.length >= 20, true);
});
