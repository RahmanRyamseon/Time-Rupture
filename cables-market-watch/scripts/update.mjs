#!/usr/bin/env node
// Daily collector for Cables & Aluminium Market Watch.
//  1. LME official prices (cash settlement, 3-month, warehouse stock) for aluminium and copper,
//     read from Westmetall's public LME tables, merged into data/prices.json.
//  2. Industry news from Google News RSS, one query set per category, merged into data/news.json.
// No dependencies: uses Node 18+ built-in fetch.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const PRICES_FILE = join(here, "..", "data", "prices.json");
export const NEWS_FILE = join(here, "..", "data", "news.json");
export const NEWS_RETENTION_DAYS = 90;
export const MAX_NEWS = 900;
export const PRICE_RETENTION_DAYS = 760; // ~2 years of trading days

// ---------------------------------------------------------------- prices

export const METALS = {
  aluminium: { field: "LME_Al_cash", label: "Aluminium" },
  copper: { field: "LME_Cu_cash", label: "Copper" },
};

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const num = (s) => {
  const n = Number(String(s).replace(/<[^>]+>/g, "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

// Parses Westmetall's table rows: <td>03. November 2026</td><td>3,082.00</td><td>3,042.00</td><td>229,475</td>
export function parsePriceTable(html) {
  const rows = [];
  for (const [, body] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].trim());
    if (cells.length < 4) continue;
    const d = cells[0].match(/^(\d{1,2})\.\s*([A-Za-z]+)\s+(\d{4})$/);
    if (!d || !MONTHS[d[2].toLowerCase()]) continue;
    const date = `${d[3]}-${String(MONTHS[d[2].toLowerCase()]).padStart(2, "0")}-${d[1].padStart(2, "0")}`;
    const cash = num(cells[1]);
    if (cash === null) continue;
    rows.push({ date, cash, m3: num(cells[2]), stock: num(cells[3]) });
  }
  return rows;
}

export function mergeSeries(existing = [], fetched = [], now = Date.now()) {
  const byDate = new Map(existing.map((r) => [r.date, r]));
  for (const r of fetched) byDate.set(r.date, r);
  const cutoff = new Date(now - PRICE_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  return [...byDate.values()].filter((r) => r.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
}

const priceUrl = (field, year) =>
  `https://www.westmetall.com/en/markdaten.php?action=table&field=${field}${year ? `&year=${year}` : ""}`;

// ---------------------------------------------------------------- news

// Each category: queries for Google News plus a relevance test applied to headline + snippet.
export const CATEGORIES = {
  projects: {
    label: "Projects & tenders",
    re: /transmission|substation|grid|interconnect|overhead line|power line|\bkv\b|tender|electrif|renewable|solar|wind farm|data cent|power plant|power project|\bipp\b|epc/i,
    queries: [
      '(transmission line OR substation OR "overhead line" OR "grid project") (Saudi OR UAE OR Bahrain OR Qatar OR Oman OR Kuwait) (contract OR tender OR awarded)',
      '("Saudi Electricity" OR "National Grid SA" OR SEC) (transmission OR substation OR "380 kV" OR "132 kV") contract',
      '(DEWA OR TRANSCO OR Kahramaa OR "Electricity and Water Authority" OR OETC OR "Nama" OR "Ministry of Electricity" Kuwait) grid contract',
      '(GCCIA OR "GCC interconnection" OR "Saudi-Egypt interconnection" OR "India-UAE interconnection") power',
      '(transmission line OR "HVDC" OR "765 kV" OR "400 kV") tender (India OR Australia OR Africa OR Egypt OR Iraq)',
    ],
  },
  orders: {
    label: "Cable orders & industry",
    re: /cable|conductor|wire|rod|harness/i,
    queries: [
      '(cable OR cables) (order OR contract OR awarded OR wins) (Prysmian OR Nexans OR NKT OR "LS Cable" OR "Taihan" OR Sumitomo OR Southwire)',
      '("Riyadh Cables" OR "Saudi Cable" OR Ducab OR Elsewedy OR "Oman Cables" OR "Gulf Cables" OR "Bahra Cables" OR "Jeddah Cables" OR "Qatar International Cable")',
      '(APAR OR Polycab OR KEI OR "Sterlite Power" OR Hindalco) (conductor OR cable) order',
      '("overhead conductor" OR AAAC OR ACSR OR HTLS OR ACCC OR "aluminium conductor" OR "aluminum conductor")',
      '("cable industry" OR "cable manufacturer" OR "cable maker") (capacity OR plant OR expansion OR acquisition OR demand)',
    ],
  },
  aluminium: {
    label: "Aluminium market",
    re: /alumin/i,
    queries: [
      '(aluminium OR aluminum) price LME',
      '(Alba OR "Aluminium Bahrain" OR "Emirates Global Aluminium" OR EGA OR "Ma\'aden" OR Qatalum OR "Sohar Aluminium") aluminium',
      '(aluminium OR aluminum) premium (Japan OR Rotterdam OR Midwest OR "Middle East" OR Asia)',
      '("wire rod" OR "aluminium rod" OR "aluminum rod" OR "EC grade" OR alloy rod) aluminium',
      '(aluminium OR aluminum) (smelter OR alumina OR bauxite) (supply OR output OR outage OR restart OR curtail)',
    ],
  },
  copper: {
    label: "Copper & metals",
    re: /copper|metal|lme|zinc|nickel|commodit/i,
    queries: ['copper price LME', '("London Metal Exchange" OR LME) (stocks OR warehouse OR rules OR fees)'],
  },
  policy: {
    label: "Trade & policy",
    re: /tariff|section 232|cbam|anti-dumping|dumping|duty|duties|quota|sanction|carbon|customs|trade/i,
    queries: [
      '(aluminium OR aluminum) (tariff OR "Section 232" OR "anti-dumping" OR duty)',
      '(CBAM OR "carbon border") (aluminium OR aluminum OR GCC OR Bahrain)',
      '(cable OR cables OR conductor) ("anti-dumping" OR tariff OR "local content" OR IKTVA)',
    ],
  },
  midal: {
    label: "Midal mentions",
    re: /midal/i,
    queries: ['"Midal Cables" OR "Midal Cable"', '"Midal" (aluminium OR aluminum OR cable OR conductor OR Bahrain)'],
  },
};

export const REGIONS = {
  Bahrain: /\bbahrain|manama\b/i,
  Saudi: /\bsaudi|riyadh|jeddah|neom|dammam|ksa\b/i,
  UAE: /\buae\b|emirat|dubai|abu dhabi|sharjah/i,
  Qatar: /\bqatar|doha\b/i,
  Oman: /\boman|muscat|sohar\b/i,
  Kuwait: /\bkuwait/i,
  India: /\bindia|indian\b|nalco|hindalco|vedanta|\bcrore\b/i,
  Australia: /\baustralia/i,
  Europe: /\beurope|\beu\b|german|france|italy|spain|uk\b|britain|netherlands|norway/i,
  // Case-sensitive so the pronoun "us" and the currency "US$" do not count.
  "North America": /\bU\.S\.(?!\$)|\bUS\b(?!\$)|United States|\bAmerica|Canad|Mexic|Alcoa/,
  China: /\bchina|chinese|shfe|shanghai/i,
  Africa: /\bafrica|egypt|nigeria|kenya|morocco/i,
};

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

export function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const src = body.match(/<source\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/);
    const publisher = src ? decode(src[2]).trim() : "";
    const publisherUrl = src ? decode(src[1]).trim() : "";
    let title = decode(field(body, "title")).trim();
    if (publisher && title.endsWith(` - ${publisher}`)) title = title.slice(0, -(publisher.length + 3)).trim();
    let description = decode(stripTags(decode(field(body, "description"))));
    if (description.startsWith(title)) description = description.slice(title.length);
    if (publisher && description.endsWith(publisher)) description = description.slice(0, -publisher.length);
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

export const detectRegions = (text) =>
  Object.entries(REGIONS)
    .filter(([, re]) => re.test(text))
    .map(([name]) => name);

// Merges freshly fetched items into the stored list. Pure, so it can be tested without network.
export function mergeNews(existing, fetched, now = Date.now()) {
  const byKey = new Map(existing.map((item) => [keyOf(item.title), item]));
  for (const raw of fetched) {
    if (!raw.title || !raw.url) continue;
    const cat = CATEGORIES[raw.category];
    const text = `${raw.title} ${raw.description}`;
    if (!cat || !cat.re.test(text)) continue;
    const key = keyOf(raw.title);
    const prev = byKey.get(key);
    const categories = [...new Set([...(prev?.categories ?? []), raw.category])];
    // A Midal mention always counts as one, wherever it was found.
    if (/midal/i.test(text) && !categories.includes("midal")) categories.push("midal");
    byKey.set(key, {
      id: createHash("sha1").update(key).digest("hex").slice(0, 12),
      title: raw.title,
      url: raw.url,
      publisher: raw.publisher,
      publisherUrl: raw.publisherUrl,
      published: raw.published,
      description: raw.description,
      categories,
      regions: detectRegions(text),
      firstSeen: prev?.firstSeen ?? new Date(now).toISOString(),
    });
  }
  const cutoff = now - NEWS_RETENTION_DAYS * 86_400_000;
  return [...byKey.values()]
    .filter((i) => Date.parse(i.published) >= cutoff)
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
    .slice(0, MAX_NEWS);
}

const feedUrl = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:3d`)}&hl=en-US&gl=US&ceid=US:en`;

// ---------------------------------------------------------------- main

const UA = "cables-market-watch/1.0 (daily digest)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function updatePrices() {
  const stored = await readJson(PRICES_FILE, { metals: {} });
  const out = { generatedAt: new Date().toISOString(), source: "LME official prices via westmetall.com", metals: {} };
  let ok = 0;
  const year = new Date().getUTCFullYear();
  for (const [key, { field, label }] of Object.entries(METALS)) {
    let series = stored.metals?.[key]?.series ?? [];
    try {
      const fetched = parsePriceTable(await get(priceUrl(field)));
      // Backfill the previous year once, so the 1-year view is full.
      if (series.length < 200) {
        await sleep(1500);
        fetched.push(...parsePriceTable(await get(priceUrl(field, year - 1))));
      }
      if (!fetched.length) throw new Error("no rows parsed");
      series = mergeSeries(series, fetched);
      ok += 1;
      console.log(`[price ${key}] ${fetched.length} rows, latest ${series.at(-1)?.date}`);
    } catch (err) {
      console.warn(`[price ${key}] failed: ${err.message}`);
    }
    out.metals[key] = { label, unit: "USD/t", stockUnit: "t", series };
    await sleep(1500);
  }
  if (ok) await writeFile(PRICES_FILE, JSON.stringify(out) + "\n");
  return ok;
}

async function updateNews() {
  const existing = (await readJson(NEWS_FILE, {})).items ?? [];
  const fetched = [];
  let ok = 0;
  for (const [category, { queries }] of Object.entries(CATEGORIES)) {
    for (const q of queries) {
      try {
        const items = parseItems(await get(feedUrl(q))).map((i) => ({ ...i, category }));
        fetched.push(...items);
        ok += 1;
        console.log(`[news ${category}] ${items.length} results`);
      } catch (err) {
        console.warn(`[news ${category}] failed: ${err.message}`);
      }
      await sleep(1500);
    }
  }
  if (ok) {
    const items = mergeNews(existing, fetched);
    const out = {
      generatedAt: new Date().toISOString(),
      retentionDays: NEWS_RETENTION_DAYS,
      categories: Object.fromEntries(Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])),
      count: items.length,
      items,
    };
    await writeFile(NEWS_FILE, JSON.stringify(out, null, 2) + "\n");
    console.log(`Wrote ${items.length} news items`);
  }
  return ok;
}

async function main() {
  const prices = await updatePrices();
  const news = await updateNews();
  if (!prices && !news) {
    console.error("Every source failed; data files left unchanged.");
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
