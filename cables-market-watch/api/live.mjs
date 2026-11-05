// Live data endpoint (Vercel serverless function): GET /api/live
//
// Fetches the newest items from the fastest sources (the trade feeds, the EU tender database,
// one or two searches per category and per market, and today's LME prices), merges them with
// the history committed by the scheduled collector (data/news.json, data/prices.json), and
// returns both. The CDN caches the response for 10 minutes, so every visitor sees data at most
// ~10 minutes old while the sources are hit at most a few times an hour.

import { readFile } from "node:fs/promises";
import {
  CATEGORIES,
  MARKETS,
  FEEDS,
  METALS,
  NEWS_FILE,
  PRICES_FILE,
  RUN_REPORT_FILE,
  BLOCKED,
  UA,
  feedUrl,
  fetchTED,
  fetchFTS,
  fetchWB,
  keyOf,
  mergeNews,
  mergeSeries,
  parseItems,
  parsePriceTable,
  priceUrl,
} from "../scripts/update.mjs";

const CACHE_SECONDS = 600;
const WINDOW = "2d";
const TIMEOUT_MS = 8000;
const CONCURRENCY = 6;

const pair = (entry) => (Array.isArray(entry) ? entry : [entry, "en"]);

// The live set: one search per category, the first searches of each market (two for Europe and
// Canada), every trade feed and the EU tender database. The full ~120-search crawl runs every
// three hours in GitHub Actions and is committed to data/news.json.
// Feeds that blocked the last full crawl (e.g. HTTP 403) block Vercel too, so the live layer
// skips them; the 3-hourly crawl keeps checking and they come back once they answer again.
export function blockedFeeds(report) {
  return new Set(
    (report?.sources ?? [])
      .filter((r) => r.kind === "feed" && (r.status === "failed" || r.status === "paused") && BLOCKED.has(r.httpStatus))
      .map((r) => r.label),
  );
}

export function liveTasks(skip = new Set()) {
  const tasks = [];
  for (const [category, c] of Object.entries(CATEGORIES)) {
    const [q, lang] = pair(c.queries[0]);
    tasks.push({ name: `news:${category}`, url: feedUrl(q, lang, WINDOW), tag: { category } });
  }
  for (const [market, m] of Object.entries(MARKETS)) {
    const n = market === "Europe" || market === "Canada" ? 2 : 1;
    for (const entry of m.queries.slice(0, n)) {
      const [q, lang] = pair(entry);
      tasks.push({ name: `projects:${market}`, url: feedUrl(q, lang, WINDOW), tag: { category: "projects", market } });
    }
  }
  for (const f of FEEDS.filter((f) => !skip.has(f.name))) {
    tasks.push({ name: `feed:${f.name}`, url: f.url, publisher: f.name, tag: { market: f.market } });
  }
  return tasks;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Runs async jobs with a small concurrency limit, collecting results and failures.
async function pool(jobs, limit) {
  const out = new Array(jobs.length);
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const i = next++;
      try {
        out[i] = { ok: true, value: await jobs[i]() };
      } catch (err) {
        out[i] = { ok: false, error: err.message };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return out;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

export async function buildLive(now = Date.now()) {
  const [newsBase, pricesBase, report] = await Promise.all([
    readJson(NEWS_FILE, { items: [] }),
    readJson(PRICES_FILE, { metals: {} }),
    readJson(RUN_REPORT_FILE, null),
  ]);
  const skipped = blockedFeeds(report);
  const tasks = liveTasks(skipped);
  const metals = Object.entries(METALS);

  const jobs = [
    ...tasks.map((t) => async () =>
      parseItems(await fetchText(t.url), t.publisher ?? "", t.publisher ? new URL(t.url).origin : "").map((i) => ({ ...i, ...t.tag })),
    ),
    async () => fetchTED({ pages: 1 }),
    async () => fetchFTS({ days: 2, maxPages: 3, pause: false }),
    async () => fetchWB({ rows: 60, terms: ["transmission", "substation", "kV"], pause: false }),
    ...metals.map(([, { field }]) => async () => parsePriceTable(await fetchText(priceUrl(field)))),
  ];
  const results = await pool(jobs, CONCURRENCY);
  const TENDERS = ["tenders:TED", "tenders:UK-FTS", "tenders:WorldBank"];
  const names = [...tasks.map((t) => t.name), ...TENDERS, ...metals.map(([k]) => `price:${k}`)];

  const newsResults = results.slice(0, tasks.length + TENDERS.length);
  const priceResults = results.slice(tasks.length + TENDERS.length);
  const fetched = newsResults.filter((r) => r.ok).flatMap((r) => r.value);

  // Merge with the committed history. Items first seen live get their publish time as firstSeen,
  // so "New since last visit" does not re-flag the same item on every 10-minute refresh.
  const known = new Set((newsBase.items ?? []).map((i) => keyOf(i.title)));
  const items = mergeNews(newsBase.items ?? [], fetched, now).map((i) =>
    known.has(keyOf(i.title)) ? i : { ...i, firstSeen: new Date(Math.min(Date.parse(i.published), now)).toISOString() },
  );

  const metalsOut = {};
  metals.forEach(([key, meta], k) => {
    const base = pricesBase.metals?.[key] ?? { label: meta.label, unit: "USD/t", stockUnit: "t", series: [] };
    const r = priceResults[k];
    metalsOut[key] = { ...base, series: r?.ok && r.value.length ? mergeSeries(base.series ?? [], r.value, now) : base.series ?? [] };
  });

  const failed = results.map((r, i) => (r.ok ? null : `${names[i]}: ${r.error}`)).filter(Boolean);
  const checkedAt = new Date(now).toISOString();
  return {
    live: {
      checkedAt,
      sources: results.length,
      ok: results.length - failed.length,
      failed,
      newItems: items.filter((i) => !known.has(keyOf(i.title))).length,
      skippedBlocked: [...skipped],
      cacheSeconds: CACHE_SECONDS,
      historyFrom: newsBase.generatedAt ?? null,
    },
    news: { ...newsBase, generatedAt: checkedAt, count: items.length, items },
    prices: { ...pricesBase, generatedAt: checkedAt, metals: metalsOut },
  };
}

export default async function handler(req, res) {
  const t0 = Date.now();
  let body, cache;
  try {
    body = await buildLive();
    body.live.durationMs = Date.now() - t0;
    // If every source failed, cache briefly so the next visitor retries soon.
    cache = body.live.ok ? CACHE_SECONDS : 60;
  } catch (err) {
    body = { live: { error: err.message } };
    cache = 30;
  }
  res.statusCode = body.news ? 200 : 503;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", `public, max-age=0, s-maxage=${cache}, stale-while-revalidate=1800`);
  res.end(JSON.stringify(body));
}
