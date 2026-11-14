/**
 * Downloads the public product feed (/products.json) of each official Shopify store into data/raw/.
 * Polite by design: honours robots.txt, identifies itself, waits between requests.
 * Raw files are git-ignored: they contain the stores' own wording, which we never republish.
 */
import fs from "node:fs";
import path from "node:path";
import { STORES, USER_AGENT } from "./stores";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RAW = path.join(process.cwd(), "data", "raw");

async function get(url: string): Promise<Response> {
  return fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json,text/html" } });
}

/** robots.txt matching with "*" wildcards and "$" anchors (Google/RFC 9309 semantics, user-agent "*"). */
export function disallowed(robots: string, p: string): boolean {
  let applies = false;
  const rules: { allow: boolean; re: RegExp; len: number }[] = [];
  for (const line of robots.split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === "user-agent") applies = v === "*";
    else if (applies && (k === "disallow" || k === "allow") && v) {
      const body = v.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      const re = new RegExp("^" + (body.endsWith("\\$") ? body.slice(0, -2) + "$" : body));
      rules.push({ allow: k === "allow", re, len: v.length });
    }
  }
  // Longest matching rule wins; Allow wins ties.
  const hits = rules.filter((r) => r.re.test(p)).sort((a, b) => b.len - a.len || Number(b.allow) - Number(a.allow));
  return hits.length > 0 && !hits[0].allow;
}

async function main() {
  fs.mkdirSync(RAW, { recursive: true });
  const only = process.argv[2];
  for (const s of STORES.filter((x) => !only || x.key === only)) {
    const robots = await (await get(`https://${s.host}/robots.txt`)).text().catch(() => "");
    if (disallowed(robots, "/products.json?limit=250&page=1")) { console.log(`skip ${s.key}: robots.txt disallows /products.json`); continue; }
    const home = await (await get(`https://${s.host}/`)).text().catch(() => "");
    const currency = home.match(/"currency":\{"active":"([A-Z]{3})"/)?.[1] ?? home.match(/Shopify\.currency\s*=\s*\{"active":"([A-Z]{3})"/)?.[1] ?? home.match(/"currencyCode":"([A-Z]{3})"/)?.[1] ?? "";
    const products: unknown[] = [];
    for (let page = 1; page < 40; page++) {
      const res = await get(`https://${s.host}/products.json?limit=250&page=${page}`);
      if (!res.ok) { console.log(`${s.key} page ${page}: HTTP ${res.status}`); break; }
      const batch = ((await res.json()) as { products: unknown[] }).products;
      if (!batch.length) break;
      products.push(...batch);
      await sleep(1500);
    }
    fs.writeFileSync(path.join(RAW, `${s.key}.json`), JSON.stringify({ store: s, currency, fetchedAt: new Date().toISOString().slice(0, 10), products }));
    console.log(`${s.key}: ${products.length} products, currency ${currency || "?"}`);
    await sleep(1500);
  }
}
if (process.argv[1]?.endsWith("fetch-shopify.ts")) main();
