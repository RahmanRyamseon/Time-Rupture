// Offline checks for the collector's parsers and merge logic: node cables-market-watch/scripts/test.mjs
import assert from "node:assert/strict";
import { parsePriceTable, mergeSeries, parseItems, mergeNews, detectRegions } from "./update.mjs";

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
const news = mergeNews([], items.map((i) => ({ ...i, category: "orders" })), Date.parse("2026-11-04"));
assert.equal(news.length, 1, "off-topic headline is filtered out");
assert.deepEqual(news[0].regions, ["Saudi"]);

assert.deepEqual(detectRegions("price averaged US$3,382/t, let us see"), []);
assert.deepEqual(detectRegions("U.S. grid order"), ["North America"]);
assert.ok(mergeNews([], [{ title: "Midal Cables expands rod line", url: "u", description: "", published: "2026-11-03T00:00:00Z", category: "orders" }], Date.parse("2026-11-04"))[0].categories.includes("midal"));
console.log("all checks passed");
