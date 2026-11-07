#!/usr/bin/env node
// Offline checks for the collector. Run: node scripts/test.mjs
import assert from "node:assert/strict";
import { BLOCKED, ESTABLISHED, FEEDS, classify, idOf, inrRates, keepable, keyOf, merge, parseItems, sameStory } from "./update.mjs";

// ---- parsing: publisher RSS, headline + link + date only
const feed = { id: "ntnews-nri", name: "Namasthe Telangana", site: "https://www.ntnews.com", lang: "te" };
const xml = `<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><title>NRI</title>
<item><title><![CDATA[Dubai ETCA &#124; దుబాయ్‌లో ఘనంగా బతుకమ్మ సంబరాలు]]></title>
<link><![CDATA[https://www.ntnews.com/nri/etca-bathukamma-1]]></link><pubDate>Tue, 13 Oct 2026 10:00:00 +0530</pubDate>
<description><![CDATA[<p>The publisher's own summary text, which must never be copied.</p>]]></description>
<content:encoded><![CDATA[<p>Full article text.</p>]]></content:encoded>
<media:content url="https://img.example/photo.jpg" medium="image"/></item>
<item><title>&apos;Smile&apos; in Sharjah</title><link>https://gulfnews.com/a</link><pubDate>bad date</pubDate></item>
<item><title>No link</title></item>
</channel></rss>`;
const items = parseItems(xml, feed);
assert.equal(items.length, 2, "items without a link are skipped");
assert.equal(items[0].title, "Dubai ETCA | దుబాయ్‌లో ఘనంగా బతుకమ్మ సంబరాలు", "CDATA and numeric entities decoded");
assert.equal(items[0].url, "https://www.ntnews.com/nri/etca-bathukamma-1");
assert.equal(items[0].publisher, "Namasthe Telangana");
assert.equal(items[0].published, "2026-10-13T04:30:00.000Z");
assert.equal(items[1].title, "'Smile' in Sharjah");
// Copyright: nothing but headline, link, date, publisher and feed id is kept.
assert.deepEqual(Object.keys(items[0]).sort(), ["feed", "published", "publisher", "publisherUrl", "title", "url"]);
assert.ok(!JSON.stringify(items).includes("summary") && !JSON.stringify(items).includes("photo.jpg"));

// ---- classification
const c = (t, lang = "te") => classify(t, lang);
assert.deepEqual(c("యాన్బూలో తెలుగు వారి దసరా, బతుకమ్మ వేడుకలు").sections, ["saudi", "top", "sangham"]);
assert.deepEqual(c("దుబాయ్ నుంచి సేఫ్‌గా తెలంగాణకు... స్వదేశానికి యువకుడు").sections, ["uae", "top", "exit"]);
assert.deepEqual(c("Saudi Arabia: Telangana man dies of heart attack", "en").sections, ["saudi", "top", "exit"]);
assert.deepEqual(c("సౌదీకి ఎయిర్ ఇండియా విమానాలు రద్దు").sections, ["saudi", "gulf", "jobs"]);
assert.equal(c("NRI | కేటీఆర్ చొరవతో స్వదేశానికి చేరుకున్న గల్ఫ్ బాధితురాలు").telugu, true);
assert.equal(c("Dubai announces gold walkway", "en"), null, "English Gulf news without a Telugu link is dropped");
assert.equal(c("తిరుమలలో భక్తుల రద్దీ"), null, "not a Gulf story");
assert.equal(c("అల్లు అర్జున్ సినిమా దుబాయ్ షెడ్యూల్ హైదరాబాద్‌కు మార్పు"), null, "film shoots are dropped");
assert.equal(c("సౌదీకి విమానాలు బంద్ Andhra Prabha Top News").telugu, false, "paper name is not a Telugu signal");
assert.ok(c("గల్ఫ్ దేశాల్లో యుద్ధ భయాలు").sections.includes("gulf"));

// Gulf papers: expat and rules news is kept without a Telugu link, filed under the paper's country.
const gdn = "https://www.gdnonline.com";
assert.deepEqual(classify("Proposed curbs on expat driving licences rejected", "en", gdn).sections, ["bahrain", "gulf", "jobs"]);
assert.deepEqual(classify("KSA: Legal action taken against 67 recruitment agencies in Saudi Arabia", "en", gdn).countries, ["saudi"]);
assert.equal(classify("Indian national killed after two helicopters collide in Nepal", "en", gdn), null, "Indians outside the Gulf");
assert.equal(classify("Mother of Ghanaian teen heads to US funeral after Trump grants visa", "en", gdn), null);
assert.equal(classify("Tennis: Alcaraz reaches Vienna final", "en", gdn), null);
assert.equal(classify("61Home - Gulf Digital News", "en", gdn), null);
assert.equal(classify("Proposed curbs on expat driving licences rejected", "en", "https://example.com"), null, "only Gulf papers");

// ---- same-story detection
assert.ok(sameStory("NOV 14 వరకు సౌదీకి ఎయిరిండియా విమానాలు రద్దు", "Air India: సౌదీకి ఎయిర్ ఇండియా విమానాలు రద్దు"));
assert.ok(!sameStory("దుబాయిలో బతుకమ్మ & దసరా సంబరాలు", "యాన్బూలో తెలుగు వారి ఆత్మీయ కలయికగా దసరా, బతుకమ్మ వేడుకలు"));
assert.equal(keyOf("తిరుమల, రద్దీ!"), "తిరుమల రద్దీ");
assert.notEqual(idOf("తిరుమల"), idOf("తిరుపతి"));

// ---- merge
const now = Date.parse("2026-11-05T16:00:00Z");
const mk = (title, extra = {}) => ({ title, url: "u", publisher: "P", published: "2026-11-05T10:00:00Z", ...classify(title, extra.lang || "te"), ...extra });
const merged = merge(
  [mk("సౌదీకి ఎయిర్ ఇండియా విమానాలు రద్దు", { publisher: "Eenadu" })],
  [
    mk("నవంబర్ 14 వరకు సౌదీకి ఎయిరిండియా విమానాలు రద్దు", { publisher: "Sakshi", published: "2026-11-05T09:00:00Z" }),
    mk("Saudi Arabia: Telangana man dies of heart attack", { lang: "en" }),
    mk("Saudi Arabia: Kerala man dies of heart attack in Riyadh", { lang: "en", telugu: false, sections: ["saudi"] }),
    mk("పాత గల్ఫ్ వార్త", { published: "2026-09-01T00:00:00Z" }),
  ],
  now,
);
assert.equal(merged.length, 3, "same story merged, old dropped, Telugu story kept apart from similar non-Telugu one");
const air = merged.find((i) => i.title.startsWith("సౌదీకి"));
assert.deepEqual(air.related.map((r) => r.publisher), ["Sakshi"]);
assert.ok(merged.every((i) => i.id));

// ---- rates
const r = inrRates({ rates: { USD: 1, INR: 94.62, AED: 3.6725, KWD: 0.31 }, time_last_update_utc: "Thu, 05 Nov 2026 00:02:31 +0000" });
assert.equal(r.inrPer.AED, 25.76);
assert.equal(r.inrPer.KWD, 305.23);

// Sources: publishers' own feeds only, never Google News (its terms allow personal readers only).
assert.ok(FEEDS.length >= 5 && FEEDS.every((f) => f.id && f.name && /^https:\/\//.test(f.url) && !/news\.google\./.test(f.url)));
assert.equal(new Set(FEEDS.map((f) => f.id)).size, FEEDS.length);
assert.ok(BLOCKED instanceof Set);

// Rumour risk: general Gulf affairs only from established outlets.
const war = classify("గల్ఫ్ దేశాల్లో మళ్లీ యుద్ధ భయాలు", "te");
assert.ok(keepable(war, [...ESTABLISHED][0]).sections.includes("gulf"));
assert.equal(keepable(war, "Some Small Site"), null);
const flights = classify("సౌదీకి ఎయిర్ ఇండియా విమానాలు రద్దు", "te");
assert.deepEqual(keepable(flights, "Some Small Site").sections, ["saudi", "jobs"], "travel news kept, but not in Gulf affairs");
assert.ok(keepable(classify("దుబాయ్‌లో తెలుగు వారి బతుకమ్మ", "te"), "Some Small Site"), "Telugu-people stories from any listed feed");

// Gulf papers' own local stories are kept under their country.
assert.deepEqual(classify("Abu Dhabi warns against mixing household cleaners", "en", "https://gulfnews.com").countries, ["uae"]);

// Exchange-rate attribution required by the free API's terms.
assert.equal(r.attribution.text, "Rates By Exchange Rate API");
console.log("ok");
