#!/usr/bin/env node
// Offline checks for the guide content, the gratuity rules and the rates. Run: node scripts/test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inrRates } from "./rates.mjs";

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const guides = read("guides.json");
const countries = read("countries.json");
const sources = read("sources.json");

// ---- every guide is complete, dated and cites official sources
const cats = new Set(guides.categories.map((c) => c.id));
const ids = new Set();
for (const g of guides.guides) {
  assert.match(g.id, /^[a-z0-9-]{2,40}$/, `id ${g.id}`);
  assert.ok(!ids.has(g.id), `duplicate ${g.id}`);
  ids.add(g.id);
  for (const k of ["title", "en", "summary", "en_summary", "html", "icon"]) assert.ok(g[k], `${g.id}: ${k}`);
  assert.ok(cats.has(g.cat), `${g.id}: category ${g.cat}`);
  assert.match(g.checked, /^\d{4}-\d{2}-\d{2}$/, `${g.id}: checked date`);
  assert.ok(g.sources.length >= 1 && g.sources.every((s) => s.name && /^https:\/\//.test(s.url)), `${g.id}: sources`);
  assert.ok(!/<script|onerror=|javascript:/i.test(g.html), `${g.id}: unsafe html`);
  // Internal links must point at pages that exist.
  for (const [, href] of g.html.matchAll(/href="(\/[^"]*)"/g)) {
    const [, kind, key] = href.split("/");
    if (kind === "g") assert.ok(guides.guides.some((x) => x.id === key), `${g.id}: link ${href}`);
    if (kind === "c") assert.ok(countries.countries.some((x) => x.id === key), `${g.id}: link ${href}`);
    if (kind === "t") assert.ok(cats.has(key), `${g.id}: link ${href}`);
  }
}
assert.ok(guides.tips.length >= 3);

// ---- every country has its official channels
const missions = sources.groups.find((x) => x.id === "missions").items.map((m) => m.url);
assert.equal(countries.countries.length, 6);
for (const c of countries.countries) {
  for (const k of ["flag", "name", "en", "idCard"]) assert.ok(c[k], `${c.id}: ${k}`);
  assert.match(c.residence.url, /^https:\/\//);
  assert.match(c.labour.url, /^https:\/\//);
  assert.ok(c.embassies.length && c.embassies.every((u) => missions.includes(u)), `${c.id}: embassies listed in sources.json`);
}

// ---- gratuity rules (same function as the calculator in app.js)
const { gratuity } = await import("../gratuity.js");
// UAE, Decree-Law 33/2021 Art. 51: 21 days/yr for 5 years, 30 days after; none under 1 year; cap 2 years' pay.
assert.equal(gratuity({ country: "uae", monthly: 3000, years: 0.9 }), 0);
assert.equal(Math.round(gratuity({ country: "uae", monthly: 3000, years: 5 })), 10500); // 5 × 21 × 100
assert.equal(Math.round(gratuity({ country: "uae", monthly: 3000, years: 7 })), 16500); // + 2 × 30 × 100
assert.equal(gratuity({ country: "uae", monthly: 3000, years: 40 }), 72000); // capped at 24 months
// Saudi, Labor Law Arts 84–85: ½ month/yr for 5 years, 1 month after; resignation reduces it.
assert.equal(gratuity({ country: "saudi", monthly: 4000, years: 6 }), 14000); // 5 × 2000 + 4000
assert.equal(gratuity({ country: "saudi", monthly: 4000, years: 1.5, resigned: true }), 0);
assert.equal(Math.round(gratuity({ country: "saudi", monthly: 4000, years: 3, resigned: true })), 2000); // ⅓ of 6000
assert.equal(Math.round(gratuity({ country: "saudi", monthly: 4000, years: 6, resigned: true })), 9333); // ⅔ of 14000
assert.equal(gratuity({ country: "saudi", monthly: 4000, years: 10, resigned: true }), 30000); // full
assert.equal(gratuity({ country: "qatar", monthly: 4000, years: 6 }), 0, "unverified countries are not calculated");

// ---- rates and their required attribution
const r = inrRates({ rates: { USD: 1, INR: 94.62, AED: 3.6725, KWD: 0.31 }, time_last_update_utc: "Thu, 05 Nov 2026 00:02:31 +0000" });
assert.equal(r.inrPer.AED, 25.76);
assert.equal(r.attribution.text, "Rates By Exchange Rate API");
console.log("ok");
