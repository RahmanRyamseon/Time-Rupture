// Build step (runs on Vercel at deploy time).
//
// 1. Downloads the OpenSanctions consolidated collections ONCE, server-side:
//      sanctions  — 90+ official sanctions lists
//      peps       — 240+ national PEP registers / Wikidata office-holders
//      crime      — wanted lists, Interpol red notices, terror & crime lists,
//                   regulator enforcement actions (incl. India NIA / NSE)
//      debarment  — World Bank / ADB / AfDB / IADB / EBRD / EU EDES / US SAM…
// 2. Builds a phonetic-sharded name index (gzip) that the /api/screen function
//    searches in milliseconds — the browser no longer downloads ~100 lists.
// 3. Emits a Vercel Build Output API tree in .vercel/output.
//
// No npm dependencies. Run with: node --max-old-space-size=7168 scripts/build.mjs

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".vercel", "output");
const OS = process.env.OS_BASE || "https://data.opensanctions.org/datasets/latest/";
const SHEETJS = { ver: "0.20.3", sha256: "cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41" };

// Copy the browser matcher as CommonJS so the server scores names identically.
fs.mkdirSync(path.join(ROOT, ".build"), { recursive: true });
const MATCH_CJS = path.join(ROOT, ".build", "match.cjs");
fs.copyFileSync(path.join(ROOT, "public", "match.js"), MATCH_CJS);
const M = require(MATCH_CJS);

const COLLECTIONS = [
  { name: "sanctions", bit: 1 },
  { name: "peps", bit: 2 },
  { name: "crime", bit: 4 },
  { name: "debarment", bit: 8 },
];
// Very large, US-healthcare-only exclusion registers: noisy for KYC and huge.
const EXCLUDE_DS = /^(us_[a-z]{2}_med_exclusions|us_hhs_exclusions)$/;
const MAX_ALIASES = 25;
const MAX_TEXT = 160;

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

async function fetchRetry(url, opts = {}, tries = 4) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.ok) return r;
      err = new Error(`HTTP ${r.status} for ${url}`);
    } catch (e) { err = e; }
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw err;
}

// ---------- streaming RFC-4180 CSV parser ----------
async function streamCSV(url, onRow) {
  const res = await fetchRetry(url);
  const dec = new TextDecoder("utf-8");
  let field = "", row = [], inQ = false, pendingQuote = false, rows = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    const text = done ? dec.decode() : dec.decode(value, { stream: true });
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (pendingQuote) {
        pendingQuote = false;
        if (c === '"') { field += '"'; continue; }
        inQ = false;
      }
      if (inQ) {
        if (c === '"') pendingQuote = true; else field += c;
        continue;
      }
      if (c === '"') { inQ = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); field = ""; onRow(row); rows++; row = []; }
      else if (c !== "\r") field += c;
    }
    if (done) break;
  }
  if (field || row.length) { row.push(field); onRow(row); rows++; }
  return rows;
}

// ---------- catalog (dataset titles / publishers) ----------
log("Fetching OpenSanctions catalog…");
const catalog = await (await fetchRetry(OS + "index.json")).json();
const catByName = new Map();
const codeByTitle = new Map();
for (const d of catalog.datasets || []) {
  if (!d || !d.name) continue;
  catByName.set(d.name, d);
  if (d.title) codeByTitle.set(d.title.trim().toLowerCase(), d.name);
}
// The CSV "dataset" column carries dataset TITLES in practice (docs say names);
// accept either and normalise to the dataset code.
const toCode = (v) => (catByName.has(v) ? v : codeByTitle.get(v.toLowerCase()) || v);
const collectionMembers = {};
for (const c of COLLECTIONS) {
  const d = catByName.get(c.name);
  collectionMembers[c.name] = new Set((d && (d.datasets || d.children)) || []);
}
const regulatory = new Set((catByName.get("regulatory") || {}).datasets || []);

function kindOf(code) {
  if (collectionMembers.sanctions.has(code)) return "Sanctions";
  if (collectionMembers.peps.has(code)) return "PEP register";
  if (/wanted|interpol|fugitive|red_notice/.test(code)) return "Wanted / law enforcement";
  if (regulatory.has(code)) return "Regulatory enforcement";
  if (collectionMembers.debarment.has(code)) return "Debarment / exclusion";
  if (collectionMembers.crime.has(code)) return "Crime / terrorism";
  return "Watchlist";
}

// ---------- ingest ----------
const entIndex = new Map();   // entity id -> idx
const ents = [];              // [id, schema, caption, dob, countries, dsIdx[], programs, mask]
const dsIndex = new Map();    // dataset code -> idx
const dsTable = [];           // [code, title, publisher, country, kind, count]
const postings = new Map();   // soundex code -> [[norm, entIdx, display|0, mask], ...]
const entNorms = [];          // per entity: Set of norms already indexed
const collMeta = {};

function dsId(code) {
  let i = dsIndex.get(code);
  if (i === undefined) {
    const d = catByName.get(code) || {};
    const pub = d.publisher || {};
    i = dsTable.length;
    dsIndex.set(code, i);
    dsTable.push([code, d.title || code, pub.name || "", pub.country_label || pub.country || "", kindOf(code), 0, d.last_change || null]);
  }
  return i;
}

function addName(raw, entIdx, caption, mask) {
  const n = M.norm(raw);
  if (!n || n.length < 2) return;
  const seen = entNorms[entIdx];
  if (seen.has(n)) return;
  if (seen.size >= MAX_ALIASES + 1) return;
  seen.add(n);
  const disp = raw.trim() === caption ? 0 : raw.trim().slice(0, 120);
  const codes = new Set();
  for (const t of n.split(" ")) {
    if (t.length < 3) continue;
    const sx = M.soundex(t);
    if (sx) codes.add(sx);
  }
  for (const c of codes) {
    let arr = postings.get(c);
    if (!arr) { arr = []; postings.set(c, arr); }
    arr.push([n, entIdx, disp, mask]);
  }
}

for (const coll of COLLECTIONS) {
  log(`Downloading ${coll.name}…`);
  let hdr = null, ci = null, kept = 0, skipped = 0;
  const rows = await streamCSV(`${OS}${coll.name}/targets.simple.csv`, (row) => {
    if (!hdr) {
      hdr = row.map((h) => h.trim().toLowerCase());
      const col = (...names) => { for (const n of names) { const j = hdr.indexOf(n); if (j > -1) return j; } return -1; };
      ci = { id: col("id"), schema: col("schema"), name: col("name", "caption"), aliases: col("aliases"),
        dob: col("birth_date"), countries: col("countries"), sanc: col("sanctions"), prog: col("program_ids"),
        ds: col("dataset", "datasets") };
      return;
    }
    const id = row[ci.id], name = (row[ci.name] || "").trim();
    if (!id || !name) return;
    const dsCodes = (row[ci.ds] || "").split(";").map((s) => s.trim()).filter(Boolean)
      .map(toCode).filter((c) => !EXCLUDE_DS.test(c));
    if (!dsCodes.length) { skipped++; return; }
    let idx = entIndex.get(id);
    if (idx === undefined) {
      idx = ents.length;
      entIndex.set(id, idx);
      const prog = ((ci.prog > -1 && row[ci.prog]) || (ci.sanc > -1 && row[ci.sanc]) || "").slice(0, MAX_TEXT);
      ents.push([id, row[ci.schema] || "", name.slice(0, 200), (row[ci.dob] || "").slice(0, 40),
        (row[ci.countries] || "").slice(0, 60), [], prog, 0]);
      entNorms.push(new Set());
    }
    const e = ents[idx];
    e[7] |= coll.bit;
    for (const c of dsCodes) {
      const di = dsId(c);
      if (!e[5].includes(di)) { e[5].push(di); dsTable[di][5]++; }
    }
    addName(name, idx, e[2], coll.bit);
    if (ci.aliases > -1 && row[ci.aliases]) {
      for (const a of row[ci.aliases].split(";")) addName(a, idx, e[2], coll.bit);
    }
    kept++;
  });
  const cm = catByName.get(coll.name) || {};
  collMeta[coll.name] = { title: cm.title || coll.name, version: cm.version || null, lastChange: cm.last_change || cm.updated_at || null, rows, kept, skipped };
  log(`${coll.name}: ${kept} entities kept (${skipped} skipped), ${postings.size} phonetic keys`);
  const unresolved = dsTable.filter((d) => !catByName.has(d[0])).length;
  if (unresolved) log(`warning: ${unresolved} dataset labels not found in catalog`);
}

// Masks on postings were set at first sight; refresh them from the merged entity.
for (const arr of postings.values()) for (const p of arr) p[3] = ents[p[1]][7];
entNorms.length = 0;

// ---------- write Build Output API tree ----------
fs.rmSync(OUT, { recursive: true, force: true });
const STATIC = path.join(OUT, "static");
fs.cpSync(path.join(ROOT, "public"), STATIC, { recursive: true });

// self-hosted, checksum-pinned SheetJS
if (process.env.LOCAL_XLSX) {
  // local testing only: reuse a locally available copy
  fs.mkdirSync(path.join(STATIC, "vendor"), { recursive: true });
  fs.copyFileSync(process.env.LOCAL_XLSX, path.join(STATIC, "vendor", "xlsx.full.min.js"));
} else {
log("Fetching SheetJS…");
const xlsx = Buffer.from(await (await fetchRetry(`https://cdn.sheetjs.com/xlsx-${SHEETJS.ver}/package/dist/xlsx.full.min.js`)).arrayBuffer());
const xsha = crypto.createHash("sha256").update(xlsx).digest("hex");
if (xsha !== SHEETJS.sha256) throw new Error(`SheetJS checksum mismatch: ${xsha}`);
fs.mkdirSync(path.join(STATIC, "vendor"), { recursive: true });
fs.writeFileSync(path.join(STATIC, "vendor", "xlsx.full.min.js"), xlsx);
}

const runtime = `nodejs${process.versions.node.split(".")[0]}.x`;
function writeFunc(name, srcFile, extra = {}) {
  const dir = path.join(OUT, "functions", "api", `${name}.func`);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(ROOT, "functions", srcFile), path.join(dir, "index.js"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "commonjs" }));
  fs.writeFileSync(path.join(dir, ".vc-config.json"), JSON.stringify({
    runtime, handler: "index.js", launcherType: "Nodejs", shouldAddHelpers: false, maxDuration: 30, ...extra,
  }, null, 2));
  return dir;
}

const screenDir = writeFunc("screen", "screen.js", { memory: 2048 });
fs.copyFileSync(MATCH_CJS, path.join(screenDir, "match.cjs"));
writeFunc("fetch", "fetch.js");

// shards: grouped by the first 3 chars of the soundex code
const shardDir = path.join(screenDir, "data", "s");
fs.mkdirSync(shardDir, { recursive: true });
const groups = new Map();
for (const [code, arr] of postings) {
  const g = code.slice(0, 3);
  if (!groups.has(g)) groups.set(g, {});
  groups.get(g)[code] = arr;
}
let shardBytes = 0;
for (const [g, obj] of groups) {
  const buf = zlib.gzipSync(JSON.stringify(obj), { level: 6 });
  shardBytes += buf.length;
  fs.writeFileSync(path.join(shardDir, g + ".json.gz"), buf);
}
postings.clear();

// entity chunks
const ENT_CHUNK = 4096;
const entDir = path.join(screenDir, "data", "e");
fs.mkdirSync(entDir, { recursive: true });
let entBytes = 0;
for (let i = 0; i < ents.length; i += ENT_CHUNK) {
  const buf = zlib.gzipSync(JSON.stringify(ents.slice(i, i + ENT_CHUNK)), { level: 6 });
  entBytes += buf.length;
  fs.writeFileSync(path.join(entDir, (i / ENT_CHUNK) + ".json.gz"), buf);
}

const builtAt = new Date().toISOString();
const lastChanges = Object.values(collMeta).map((c) => Date.parse(c.lastChange)).filter((x) => !isNaN(x));
const meta = {
  builtAt,
  asOf: lastChanges.length ? new Date(Math.max(...lastChanges)).toISOString() : builtAt,
  entChunk: ENT_CHUNK,
  entities: ents.length,
  collections: collMeta,
  datasets: dsTable.map(([code, title, publisher, country, kind, count, lastChange]) => ({ code, title, publisher, country, kind, count, lastChange })),
};
fs.writeFileSync(path.join(screenDir, "data", "meta.json"), JSON.stringify(meta));
fs.mkdirSync(path.join(STATIC, "data"), { recursive: true });
fs.writeFileSync(path.join(STATIC, "data", "meta.json"), JSON.stringify(meta));

// routing + security headers
const security = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://data.opensanctions.org https://data.trade.gov https://www.wikidata.org https://en.wikipedia.org https://api.gleif.org https://abacus.jasoncameron.dev; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};
fs.writeFileSync(path.join(OUT, "config.json"), JSON.stringify({
  version: 3,
  routes: [
    { src: "/(.*)", headers: security, continue: true },
    { src: "/data/meta\\.json", headers: { "Cache-Control": "public, max-age=0, s-maxage=600" }, continue: true },
    { src: "/(vendor/.*|.*\\.(?:js|css))", headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" }, continue: true },
    { handle: "filesystem" },
  ],
}, null, 2));

const mb = (b) => (b / 1048576).toFixed(1) + " MB";
log(`Done: ${ents.length} entities, ${groups.size} shards (${mb(shardBytes)}), entities ${mb(entBytes)}, ${dsTable.length} datasets, runtime ${runtime}`);
