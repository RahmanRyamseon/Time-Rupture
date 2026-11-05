#!/usr/bin/env node
// News collector for Rachabanda (రచ్చబండ), a Telugu news + community site.
// Pulls Telugu Google News RSS feeds per section, merges them into data/news.json and keeps
// RETENTION_DAYS of items. No dependencies: Node 18+ built-in fetch.
//
//   node scripts/update.mjs                 # live fetch
//   FIXTURE_DIR=path node scripts/update.mjs  # read <section-id>.xml files instead (offline)

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_FILE = join(here, "..", "data", "news.json");
export const RETENTION_DAYS = 5;
export const MAX_PER_SECTION = 80;

const GN = "https://news.google.com/rss";
const LOCALE = "hl=te&gl=IN&ceid=IN:te";
const topic = (t) => `${GN}/headlines/section/topic/${t}?${LOCALE}`;
const search = (q) => `${GN}/search?q=${encodeURIComponent(`${q} when:2d`)}&${LOCALE}`;

// Section ids match the tabs in app.js. Each section can have several feeds.
export const SECTIONS = [
  { id: "top", feeds: [`${GN}?${LOCALE}`] },
  { id: "ap", feeds: [search("ఆంధ్రప్రదేశ్"), search("అమరావతి OR విశాఖపట్నం OR విజయవాడ OR తిరుపతి")] },
  { id: "ts", feeds: [search("తెలంగాణ"), search("హైదరాబాద్ OR వరంగల్ OR కరీంనగర్")] },
  { id: "national", feeds: [topic("NATION")] },
  { id: "world", feeds: [topic("WORLD")] },
  { id: "cinema", feeds: [topic("ENTERTAINMENT"), search("టాలీవుడ్ OR తెలుగు సినిమా")] },
  { id: "sports", feeds: [topic("SPORTS")] },
  { id: "business", feeds: [topic("BUSINESS")] },
  { id: "tech", feeds: [topic("TECHNOLOGY"), topic("SCIENCE")] },
  { id: "health", feeds: [topic("HEALTH")] },
  { id: "jobs", feeds: [search("ఉద్యోగాలు OR నోటిఫికేషన్ OR ఫలితాలు OR APPSC OR TGPSC")] },
  { id: "farm", feeds: [search("రైతులు OR వ్యవసాయం OR పంట")] },
  { id: "devotional", feeds: [search("తిరుమల OR శ్రీవారి OR ఆలయం OR పండుగ")] },
  { id: "nri", feeds: [search("ప్రవాస తెలుగు OR ఎన్ఆర్ఐ OR తానా OR నాట్స్")] },
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

// Google appends " - Publisher" to every headline.
const dropSuffix = (title, publisher) =>
  publisher && title.endsWith(` - ${publisher}`) ? title.slice(0, -(publisher.length + 3)).trim() : title;

// Parses a Google News RSS document. Story clusters carry an <ol> of the same story from
// other papers; those become `related`.
export function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const src = body.match(/<source\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/);
    const publisher = src ? decode(src[2]).trim() : "";
    const publisherUrl = src ? decode(src[1]).trim() : "";
    const title = dropSuffix(decode(field(body, "title")).trim(), publisher);
    const html = decode(field(body, "description"));

    const related = [];
    let description = "";
    if (/<li>/i.test(html)) {
      for (const [, li] of html.matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
        const a = li.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const font = li.match(/<font[^>]*>([\s\S]*?)<\/font>/i);
        if (!a) continue;
        const r = { title: decode(stripTags(a[2])), url: a[1], publisher: font ? decode(stripTags(font[1])) : "" };
        if (r.title !== title && r.publisher !== publisher) related.push(r);
      }
    } else {
      description = decode(stripTags(html));
      if (description.startsWith(title)) description = description.slice(title.length);
      if (publisher && description.endsWith(publisher)) description = description.slice(0, -publisher.length);
      description = description.replace(/^[\s\-–|]+|[\s\-–|]+$/g, "").slice(0, 300);
      // Google's "see more headlines from X on Google News" filler is not a summary.
      if (/Google News/i.test(description)) description = "";
    }

    return {
      title,
      url: decode(field(body, "link")).trim(),
      publisher,
      publisherUrl,
      published: parseDate(decode(field(body, "pubDate"))),
      description,
      related: related.slice(0, 4),
    };
  });
}

// Headline key for de-duplication: letters (any script) and digits only.
export const keyOf = (title) => title.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
export const idOf = (title) => createHash("sha1").update(keyOf(title)).digest("hex").slice(0, 12);

// Merges freshly fetched items into the stored list. Pure, so it is testable offline.
// An item fetched under several sections keeps all of them.
export function merge(existing, fetched, now = Date.now()) {
  const cutoff = now - RETENTION_DAYS * 864e5;
  const byId = new Map();
  for (const item of [...existing, ...fetched]) {
    if (!item.title || Date.parse(item.published) < cutoff) continue;
    const id = item.id || idOf(item.title);
    const prev = byId.get(id);
    if (prev) {
      prev.sections = [...new Set([...prev.sections, ...item.sections])];
      if (!prev.related?.length && item.related?.length) prev.related = item.related;
    } else {
      byId.set(id, { ...item, id, sections: [...item.sections] });
    }
  }
  const all = [...byId.values()].sort((a, b) => b.published.localeCompare(a.published));
  // Cap each section so one busy section cannot push the others out.
  const counts = {};
  return all.filter((item) => {
    const keep = item.sections.some((s) => (counts[s] || 0) < MAX_PER_SECTION);
    if (keep) for (const s of item.sections) counts[s] = (counts[s] || 0) + 1;
    return keep;
  });
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RachabandaBot/1.0)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const fixtures = process.env.FIXTURE_DIR;
  let stored = { items: [] };
  try {
    stored = JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch {}

  const fetched = [];
  const report = {};
  for (const section of SECTIONS) {
    let n = 0;
    const feeds = fixtures ? [join(fixtures, `${section.id}.xml`)] : section.feeds;
    for (const feed of feeds) {
      try {
        const xml = fixtures ? await readFile(feed, "utf8") : await fetchFeed(feed);
        const items = parseItems(xml).map((i) => ({ ...i, sections: [section.id] }));
        fetched.push(...items);
        n += items.length;
      } catch (err) {
        if (!fixtures || err.code !== "ENOENT") console.warn(`! ${section.id}: ${err.message}`);
      }
    }
    report[section.id] = n;
  }

  const total = Object.values(report).reduce((a, b) => a + b, 0);
  if (!total) {
    console.error("No items fetched; keeping existing data.");
    process.exitCode = 1;
    return;
  }

  const items = merge(stored.items, fetched);
  await writeFile(DATA_FILE, JSON.stringify({ updated: new Date().toISOString(), items }, null, 1) + "\n");
  console.log(`Fetched per section: ${JSON.stringify(report)}`);
  console.log(`Stored ${items.length} items.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
