// POST /api/screen  { names: ["Vladimir Putin", "Rosneft", ...] }   (max 100 per call)
// GET  /api/screen?q=Vladimir%20Putin
//
// Searches the prebuilt OpenSanctions index (built at deploy time by
// scripts/build.mjs) for sanctions, PEP, crime/wanted/regulatory and debarment
// matches. Shards are small gzip files keyed by phonetic code and cached in
// memory, so a warm lookup takes a few milliseconds.
//
// Security: same-origin callers only, per-IP rate limit, bounded input sizes,
// JSON-only responses with nosniff. Names are never logged.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const M = require("./match.cjs");

const DATA = path.join(__dirname, "data");
const META = JSON.parse(fs.readFileSync(path.join(DATA, "meta.json"), "utf8"));
const BITS = { sanctions: 1, pep: 2, crime: 4, debarment: 8 };
const MAX_NAMES = 100;
const MAX_NAME_LEN = 300;
const CACHE_LIMIT = 700 * 1024 * 1024; // approx. bytes of decompressed JSON kept in memory

// ---------- tiny LRU over decompressed files ----------
const cache = new Map();
let cacheBytes = 0;
function loadGz(rel) {
  const hit = cache.get(rel);
  if (hit) { cache.delete(rel); cache.set(rel, hit); return hit.v; }
  let v = null, size = 0;
  try {
    const raw = zlib.gunzipSync(fs.readFileSync(path.join(DATA, rel)));
    size = raw.length;
    v = JSON.parse(raw.toString("utf8"));
  } catch (e) { v = null; }
  cache.set(rel, { v, size });
  cacheBytes += size;
  while (cacheBytes > CACHE_LIMIT && cache.size > 1) {
    const [k, old] = cache.entries().next().value;
    cache.delete(k); cacheBytes -= old.size;
  }
  return v;
}
const shard = (code) => (loadGz(`s/${code.slice(0, 3)}.json.gz`) || {})[code] || [];
function entity(idx) {
  const chunk = loadGz(`e/${Math.floor(idx / META.entChunk)}.json.gz`);
  return chunk ? chunk[idx % META.entChunk] : null;
}

// ---------- rate limit ----------
const hits = new Map();
function limited(ip) {
  const now = Date.now(), rec = hits.get(ip);
  if (!rec || now - rec.t > 60000) { hits.set(ip, { t: now, n: 1 }); if (hits.size > 5000) hits.clear(); return false; }
  return ++rec.n > 120;
}

// ---------- matching ----------
function describe(best, q) {
  const e = entity(best.p[1]);
  if (!e) return null;
  const [id, schema, caption, dob, countries, dsIdx, programs] = e;
  return {
    score: Math.round(best.sc * 1000) / 1000,
    matchType: best.type,
    matched: best.p[2] || caption,
    matchedNorm: best.p[0],
    caption, id, schema,
    dob: dob || "", countries: countries || "",
    programs: programs || "",
    datasets: dsIdx.map((i) => META.datasets[i] && META.datasets[i].code).filter(Boolean),
    url: "https://www.opensanctions.org/entities/" + encodeURIComponent(id) + "/",
    others: best.others || 0,
  };
}

function screenName(name) {
  const q = M.norm(String(name).slice(0, MAX_NAME_LEN));
  const out = { name: String(name).slice(0, MAX_NAME_LEN), q, sanctions: null, pep: null, crime: null, debarment: null };
  if (!q) return out;
  const qToks = q.split(" ").filter((t) => t.length > 2);
  const codes = [...new Set(qToks.map(M.soundex).filter(Boolean))];

  // candidate recall: every posting sharing a phonetic token code
  const cand = new Map();          // key -> {p, hits}
  let total = 0;
  for (const c of codes) {
    for (const p of shard(c)) {
      const k = p[0] + "|" + p[1];
      const r = cand.get(k);
      if (r) r.hits++; else { cand.set(k, { p, hits: 1 }); total++; }
    }
  }
  const needHits = total > 150000 && codes.length >= 2 ? 2 : 1;

  // generic single-word guard: frequency of the lone distinctive token
  let freq = 0;
  if (qToks.length === 1) {
    for (const { p } of cand.values()) if (p[0].split(" ").includes(qToks[0])) freq++;
  }

  const scoreCache = new Map();
  const best = { 1: null, 2: null, 4: null, 8: null };
  const strong = { 1: 0, 2: 0, 4: 0, 8: 0 };
  for (const { p, hits } of cand.values()) {
    if (hits < needHits) continue;
    let ex = scoreCache.get(p[0]);
    if (!ex) { ex = M.nameScoreEx(q, p[0]); scoreCache.set(p[0], ex); }
    let sc = ex.score;
    if (qToks.length === 1 && p[0] !== q && freq >= 30) sc *= 0.55;
    for (const bit of [1, 2, 4, 8]) {
      if (!(p[3] & bit)) continue;
      if (sc >= 0.84) strong[bit]++;
      const b = best[bit];
      if (!b || sc > b.sc || (sc === b.sc && p[2] === 0 && b.p[2] !== 0)) best[bit] = { p, sc, type: ex.type };
    }
  }
  const nTok = q.split(" ").filter((t) => t.length > 1).length;
  for (const [key, bit] of Object.entries(BITS)) {
    const b = best[bit];
    if (!b) continue;
    // PEP registers are huge and person names are noisy: strict band + 2 tokens.
    const floor = bit === 2 ? 0.92 : 0.84;
    if (b.sc < floor || (bit === 2 && nTok < 2 && b.p[0] !== q)) continue;
    b.others = Math.max(0, strong[bit] - 1);
    out[key] = describe(b, q);
    if (out[key]) out[key].status = b.sc >= 0.92 ? "hit" : "possible";
  }
  return out;
}

function send(res, status, obj, extra) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
    ...(extra || {}),
  });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin") return send(res, 403, { error: "cross-site requests are not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return send(res, 429, { error: "rate limit exceeded" }, { "retry-after": "60" });

  let names;
  try {
    if (req.method === "GET") {
      const q = new URL(req.url, "http://localhost").searchParams.get("q");
      names = q ? [q] : [];
    } else if (req.method === "POST") {
      const body = JSON.parse(await readBody(req, 64 * 1024));
      names = Array.isArray(body && body.names) ? body.names : [];
    } else {
      return send(res, 405, { error: "method not allowed" }, { allow: "GET, POST" });
    }
  } catch (e) {
    return send(res, 400, { error: "invalid request" });
  }
  names = names.filter((n) => typeof n === "string" && n.trim()).slice(0, MAX_NAMES);
  if (!names.length) return send(res, 400, { error: "no names supplied" });

  const t = Date.now();
  const results = names.map(screenName);
  return send(res, 200, { asOf: META.asOf, builtAt: META.builtAt, ms: Date.now() - t, results });
};

module.exports.screenName = screenName;
