// Offline checks for the collector's parsers and merge logic: node cables-market-watch/scripts/test.mjs
import assert from "node:assert/strict";
import { parsePriceTable, mergeSeries, parseItems, mergeNews, detectRegions, detectStage, detectValue, classify, marketsOf, detectActor, COMPETITORS } from "./update.mjs";

const table = `<table><thead><tr class="shaded"><th>date</th><th>cash</th><th>3-month</th><th>stock</th></tr></thead><tbody>
<tr>\n<td>03. November 2026</td>\n<td>3,082.00</td>\n<td>3,042.00</td>\n<td class="last">229,475</td>\n</tr>
<tr class="shaded"><th class="text">date</th><th>x</th><th>y</th><th>z</th></tr> <tr>
<td>30. October 2026</td><td>3,114.00</td><td>3,080.00</td><td class="last">231,200</td></tr></tbody></table>`;
const rows = parsePriceTable(table);
assert.deepEqual(rows, [
  { date: "2026-11-03", cash: 3082, m3: 3042, stock: 229475 },
  { date: "2026-10-30", cash: 3114, m3: 3080, stock: 231200 },
]);
const merged = mergeSeries([{ date: "2026-10-30", cash: 1, m3: 1, stock: 1 }], rows, Date.parse("2026-11-04"));
assert.equal(merged.length, 2);
assert.equal(merged[0].date, "2026-10-30");
assert.equal(merged[0].cash, 3114, "fresh rows replace stored ones");

const rss = `<rss><channel><item><title>Riyadh Cables wins SEC cable order - Argaam</title>
<link>https://news.google.com/rss/articles/abc</link><pubDate>Mon, 02 Nov 2026 08:00:00 GMT</pubDate>
<description>&lt;a href="x"&gt;Riyadh Cables wins SEC cable order&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font&gt;Argaam&lt;/font&gt;</description>
<source url="https://www.argaam.com">Argaam</source></item>
<item><title>Football results - Sports</title><link>https://x</link><pubDate>Mon, 02 Nov 2026 08:00:00 GMT</pubDate><description></description><source url="https://s">Sports</source></item></channel></rss>`;
const items = parseItems(rss);
assert.equal(items[0].title, "Riyadh Cables wins SEC cable order");
assert.equal(items[0].publisher, "Argaam");
const news = mergeNews([], items.map((i) => ({ ...i, category: "competitors" })), Date.parse("2026-11-04"));
assert.equal(news.length, 1, "off-topic headline is filtered out");
assert.deepEqual(news[0].regions, ["Saudi"]);
assert.ok(news[0].categories.includes("competitors"));
assert.deepEqual(news[0].companies, ["Riyadh Cables", "Saudi Energy (SEC)"].filter((c) => news[0].companies.includes(c)));
assert.equal(news[0].stage, "Award");

assert.deepEqual(detectRegions("price averaged US$3,382/t, let us see"), []);
assert.deepEqual(marketsOf(detectRegions("U.S. grid order")), ["USA"]);
assert.ok(mergeNews([], [{ title: "Midal Cables expands rod line", url: "u", description: "", published: "2026-11-03T00:00:00Z", category: "competitors" }], Date.parse("2026-11-04"))[0].categories.includes("midal"));

// Deal stage and value
assert.equal(detectStage("Kahramaa tenders $200m of grid works for Dukhan solar plant"), "Tender");
assert.equal(detectStage("Nama Holding and State Grid Sign Framework Agreement for 1 GW Battery Storage"), "Plan");
assert.equal(detectStage("LME aluminium weighs on mixed macro signals"), null, "'signals' is not 'signs'");
assert.equal(detectStage("Oman-GCC power link reaches 35% completion"), "Construction");
assert.equal(detectStage("Oman-GCC power link update", "Construction is about 35% complete"), "Construction", "falls back to the snippet");
assert.equal(detectValue("EWA awards BD34.97m feeder cable contract"), "BD34.97m");
assert.equal(detectValue("Al Yamamah wins SAR 254.27 million tower contracts"), "SAR 254.27 million");
assert.equal(detectValue("LME aluminium at $3/t"), null);

// Off-topic trade-site items are dropped; relevant ones are kept and tagged.
assert.equal(classify("Dubai Municipality to replace communal bins with two per household").categories.length, 0);
assert.ok(classify("Ducab reports 10% rise in renewables sales at ADIPEC").categories.includes("competitors"));
const ar = classify("ترسية مشروع محطة تحويل 380 ك.ف على شركة الفنار في الرياض");
assert.ok(ar.categories.includes("projects") && ar.companies.includes("Alfanar") && ar.regions.includes("Saudi"));

// Markets
assert.deepEqual(marketsOf(detectRegions("BC Hydro breaks ground near Prince George, British Columbia")), ["Canada"]);
assert.deepEqual(marketsOf(detectRegions("Brazil awards all eight transmission lots")), ["Latin America"]);
assert.deepEqual(marketsOf(detectRegions("Eskom delays grid expansion plan")), ["Africa"]);
assert.deepEqual(marketsOf(detectRegions("National Grid consults on Norwich to Tilbury pylons")), ["Europe"]);
assert.deepEqual(marketsOf(detectRegions("POWERGRID wins 765 kV project in Gujarat")), ["Asia"]);
assert.deepEqual(marketsOf(detectRegions("EWA awards Bahrain cable works")), ["Middle East"]);
assert.deepEqual(marketsOf([], "Oceania"), ["Oceania"], "falls back to the market of the search");

// Competitors come from data/competitors.json and every one has a source.
assert.ok(COMPETITORS.length >= 20);
for (const c of COMPETITORS) {
  assert.ok(c.sources?.length, `${c.name} has no source`);
  assert.doesNotThrow(() => new RegExp(c.match, "i"), `${c.name} match`);
}
assert.ok(classify("APAR Industries bags conductor order").companies.includes("APAR Industries"));
assert.ok(classify("Prysmian wins TenneT cable contract").categories.includes("competitors"));

// Winners named in headlines (to surface untracked competitors)
assert.equal(detectActor("Taihan Cable & Solution secures U.S. ultra-high-voltage power grid project"), "Taihan Cable & Solution");
assert.equal(detectActor("Xyz Wires bags 400 kV conductor order"), "Xyz Wires");
assert.equal(detectActor("The ministry signs a deal"), null);
console.log("all checks passed");
