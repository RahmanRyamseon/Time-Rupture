#!/usr/bin/env node
// Refreshes data/rates.json: Gulf currency → Indian rupee reference rates from the free
// exchangerate-api.com endpoint (its terms require the attribution shown on the site).
//
//   node scripts/rates.mjs

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATES_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "rates.json");

export function inrRates(api) {
  const r = api.rates;
  const inrPer = {};
  for (const c of ["AED", "SAR", "QAR", "KWD", "OMR", "BHD"]) if (r[c] && r.INR) inrPer[c] = +(r.INR / r[c]).toFixed(2);
  return {
    updated: new Date(api.time_last_update_utc || Date.now()).toISOString(),
    source: "exchangerate-api.com",
    attribution: { text: "Rates By Exchange Rate API", url: "https://www.exchangerate-api.com" },
    inrPer,
  };
}

async function main() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { "User-Agent": "GulfTeluguGuide/1.0 (+https://gulfteluguguide.vercel.app/about)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rates = inrRates(await res.json());
  if (Object.keys(rates.inrPer).length < 6) throw new Error("incomplete rates");
  await writeFile(RATES_FILE, JSON.stringify(rates, null, 1) + "\n");
  console.log("Rates updated:", JSON.stringify(rates.inrPer));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
