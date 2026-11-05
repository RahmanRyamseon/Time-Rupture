#!/usr/bin/env node
// Offline checks for the collector's parser and merge. Run: node scripts/test.mjs
import assert from "node:assert/strict";
import { idOf, keyOf, merge, parseItems, SECTIONS } from "./update.mjs";

const xml = `<rss><channel>
<item><title>తిరుమలలో భక్తుల రద్దీ - Eenadu</title><link>https://news.google.com/rss/articles/A?oc=5</link>
<pubDate>Thu, 05 Nov 2026 14:59:57 GMT</pubDate>
<description>&lt;a href="x"&gt;తిరుమలలో భక్తుల రద్దీ&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Eenadu&lt;/font&gt;</description>
<source url="https://www.eenadu.net">Eenadu</source></item>
<item><title>భారత్ ఘన విజయం - Sakshi</title><link>https://news.google.com/rss/articles/B?oc=5</link>
<pubDate>Thu, 05 Nov 2026 10:00:00 GMT</pubDate>
<description>&lt;ol&gt;&lt;li&gt;&lt;a href="https://n/B"&gt;భారత్ ఘన విజయం&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Sakshi&lt;/font&gt;&lt;/li&gt;&lt;li&gt;&lt;a href="https://n/C"&gt;టీమిండియా గెలుపు&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;NTV Telugu&lt;/font&gt;&lt;/li&gt;&lt;/ol&gt;</description>
<source url="https://www.sakshi.com">Sakshi</source></item>
<item><title>వార్త - V6 Velugu</title><link>L</link><pubDate>Thu, 05 Nov 2026 09:00:00 GMT</pubDate>
<description>V6 Velugu Google Newsలో మరిన్ని హెడ్‌లైన్‌లను చూడండి</description><source url="https://www.v6velugu.com">V6 Velugu</source></item>
</channel></rss>`;

const items = parseItems(xml);
assert.equal(items.length, 3);
assert.equal(items[0].title, "తిరుమలలో భక్తుల రద్దీ");
assert.equal(items[0].publisher, "Eenadu");
assert.equal(items[0].description, "");
assert.equal(items[0].published, "2026-11-05T14:59:57.000Z");
assert.deepEqual(items[1].related, [{ title: "టీమిండియా గెలుపు", url: "https://n/C", publisher: "NTV Telugu" }]);
assert.equal(items[2].description, "", "Google News filler is dropped");

// Telugu letters, including vowel signs, survive the key.
assert.equal(keyOf("తిరుమల, రద్దీ!"), "తిరుమల రద్దీ");
assert.notEqual(idOf("తిరుమల"), idOf("తిరుపతి"));

const now = Date.parse("2026-11-05T16:00:00Z");
const a = items.map((i) => ({ ...i, sections: ["top"] }));
const b = [{ ...items[0], sections: ["devotional"] }, { ...items[2], published: "2026-10-01T00:00:00Z", title: "పాతది", sections: ["ts"] }];
const merged = merge(a, b, now);
assert.equal(merged.length, 3, "duplicates merged, old items dropped");
assert.deepEqual(merged[0].sections, ["top", "devotional"]);
assert.ok(merged.every((i) => i.id));

assert.ok(new Set(SECTIONS.map((s) => s.id)).size === SECTIONS.length);
console.log("ok");
