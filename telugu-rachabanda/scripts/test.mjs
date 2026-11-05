#!/usr/bin/env node
// Offline checks for the collector. Run: node scripts/test.mjs
import assert from "node:assert/strict";
import { FEEDS, classify, idOf, inrRates, keyOf, merge, parseItems, sameStory } from "./update.mjs";

// ---- parsing
const xml = `<rss><channel>
<item><title>యాన్బూలో తెలుగు వారి దసరా, బతుకమ్మ వేడుకలు - Andhrajyothy</title><link>https://news.google.com/rss/articles/A?oc=5</link>
<pubDate>Thu, 05 Nov 2026 14:59:57 GMT</pubDate><description>x</description><source url="https://www.andhrajyothy.com">Andhrajyothy</source></item>
<item><title>దుబాయిలో బతుకమ్మ &amp;amp; దసరా సంబరాలు.. - sakshitha news</title><link>L</link><pubDate>bad date</pubDate><source url="https://s.com">sakshitha news</source></item>
</channel></rss>`;
const items = parseItems(xml);
assert.equal(items.length, 2);
assert.equal(items[0].title, "యాన్బూలో తెలుగు వారి దసరా, బతుకమ్మ వేడుకలు");
assert.equal(items[0].publisher, "Andhrajyothy");
assert.equal(items[0].published, "2026-11-05T14:59:57.000Z");
assert.equal(items[1].title, "దుబాయిలో బతుకమ్మ & దసరా సంబరాలు..", "double-escaped & is decoded");

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

assert.ok(FEEDS.length >= 10 && FEEDS.every((f) => f.url.startsWith("https://news.google.com/")));
console.log("ok");
