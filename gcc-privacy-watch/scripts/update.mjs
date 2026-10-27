#!/usr/bin/env node
// Daily collector for GCC Data Privacy Watch.
// Pulls Google News RSS results for each query, merges them into data/updates.json
// and keeps items for RETENTION_DAYS. No dependencies: uses Node 18+ built-in fetch.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_FILE = join(here, "..", "data", "updates.json");
export const RETENTION_DAYS = 120;
export const MAX_ITEMS = 600;

const PRIVACY_RE =
  /data protection|personal data|data privacy|privacy|pdpl|pdpa|personal information/i;

export const COUNTRIES = {
  BH: { name: "Bahrain", terms: ["Bahrain"] },
  SA: { name: "Saudi Arabia", terms: ["Saudi", "SDAIA"] },
  AE: { name: "UAE", terms: ["UAE", "Emirati", "Dubai", "Abu Dhabi", "Emirates"] },
  QA: { name: "Qatar", terms: ["Qatar", "NCSA"] },
  OM: { name: "Oman", terms: ["Oman", "MTCIT"] },
  KW: { name: "Kuwait", terms: ["Kuwait", "CITRA"] },
  MZ: { name: "Mozambique", terms: ["Mozambique", "INTIC"] },
};

// `scope` is the fallback country tag when the headline names none of the countries above.
export const QUERIES = [
  { scope: "BH", q: '(Bahrain) ("personal data" OR "data protection" OR privacy)' },
  { scope: "SA", q: '(Saudi OR SDAIA) ("personal data" OR PDPL OR "data protection")' },
  { scope: "AE", q: '(UAE OR "UAE Data Office") ("personal data" OR PDPL OR "data protection")' },
  { scope: "QA", q: '(Qatar OR NCSA) ("personal data" OR "data privacy" OR "data protection")' },
  { scope: "OM", q: '(Oman OR MTCIT) ("personal data" OR PDPL OR "data protection")' },
  { scope: "KW", q: '(Kuwait OR CITRA) ("personal data" OR "data privacy" OR "data protection")' },
  { scope: "GCC", q: 'GCC ("data protection" OR "personal data" OR "data privacy") regulation' },
  { scope: "MZ", q: '(Mozambique) ("personal data" OR "data protection" OR privacy)' },
  {
    scope: "GCC",
    q: 'site:gov.bh OR site:sdaia.gov.sa OR site:uaelegislation.gov.ae OR site:u.ae OR site:ncsa.gov.qa OR site:decree.om OR site:citra.gov.kw ("personal data" OR "data protection")',
  },
];

const decode = (s = "") =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const field = (body, name) => {
  const m = body.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : "";
};

const parseDate = (s) => {
  const t = Date.parse(s);
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
};

// Parses a Google News RSS document into plain objects.
export function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const src = body.match(/<source\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/);
    const publisher = src ? decode(src[2]).trim() : "";
    const publisherUrl = src ? decode(src[1]).trim() : "";

    // Google appends " - Publisher" to every headline; drop that suffix.
    let title = decode(field(body, "title")).trim();
    if (publisher && title.endsWith(` - ${publisher}`)) {
      title = title.slice(0, -(publisher.length + 3)).trim();
    }

    // The description is HTML (entity-escaped) that repeats the headline and publisher.
    // Decode, strip the tags, then decode the entities that were inside the markup.
    let description = decode(stripTags(decode(field(body, "description"))));
    if (description.startsWith(title)) description = description.slice(title.length);
    if (publisher && description.endsWith(publisher)) {
      description = description.slice(0, -publisher.length);
    }
    description = description.replace(/^[\s\-–|]+|[\s\-–|]+$/g, "").slice(0, 280);

    return {
      title,
      url: decode(field(body, "link")).trim(),
      publisher,
      publisherUrl,
      published: parseDate(decode(field(body, "pubDate"))),
      description,
    };
  });
}

export const keyOf = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const isOfficial = (publisherUrl) => {
  try {
    const host = new URL(publisherUrl).hostname;
    return /\.gov(\.[a-z]{2})?$/.test(host) || host === "decree.om";
  } catch {
    return false;
  }
};

export function detectCountries(text, scope) {
  const hits = Object.entries(COUNTRIES)
    .filter(([, c]) => c.terms.some((t) => new RegExp(`\\b${t}\\b`, "i").test(text)))
    .map(([code]) => code);
  if (hits.length) return hits;
  return scope in COUNTRIES ? [scope] : ["GCC"];
}

// Merges freshly fetched items into the stored list. Pure, so it can be tested without network.
export function merge(existing, fetched, now = Date.now()) {
  const byKey = new Map(existing.map((item) => [keyOf(item.title), item]));

  for (const raw of fetched) {
    if (!raw.title || !raw.url) continue;
    if (!PRIVACY_RE.test(`${raw.title} ${raw.description}`)) continue;

    const key = keyOf(raw.title);
    const prev = byKey.get(key);
    const text = `${raw.title} ${raw.description}`;
    byKey.set(key, {
      id: createHash("sha1").update(key).digest("hex").slice(0, 12),
      title: raw.title,
      url: raw.url,
      publisher: raw.publisher,
      publisherUrl: raw.publisherUrl,
      published: raw.published,
      description: raw.description,
      countries: detectCountries(text, raw.scope),
      category: isOfficial(raw.publisherUrl) ? "official" : "news",
      firstSeen: prev?.firstSeen ?? new Date(now).toISOString(),
    });
  }

  const cutoff = now - RETENTION_DAYS * 86_400_000;
  return [...byKey.values()]
    .filter((i) => Date.parse(i.published) >= cutoff)
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
    .slice(0, MAX_ITEMS);
}

const feedUrl = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:3d`)}&hl=en-US&gl=US&ceid=US:en`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let existing = [];
  try {
    existing = JSON.parse(await readFile(DATA_FILE, "utf8")).items ?? [];
  } catch {
    // First run: no stored data yet.
  }

  const fetched = [];
  let succeeded = 0;
  for (const { scope, q } of QUERIES) {
    try {
      const res = await fetch(feedUrl(q), {
        headers: { "user-agent": "gcc-privacy-watch/1.0 (daily digest)" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseItems(await res.text()).map((i) => ({ ...i, scope }));
      fetched.push(...items);
      succeeded += 1;
      console.log(`[${scope}] ${items.length} results`);
    } catch (err) {
      console.warn(`[${scope}] failed: ${err.message}`);
    }
    await sleep(1500);
  }

  if (succeeded === 0) {
    console.error("All feeds failed; data/updates.json left unchanged.");
    process.exit(1);
  }

  const items = merge(existing, fetched);
  const out = {
    generatedAt: new Date().toISOString(),
    retentionDays: RETENTION_DAYS,
    count: items.length,
    items,
  };
  await writeFile(DATA_FILE, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${items.length} items to ${DATA_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
