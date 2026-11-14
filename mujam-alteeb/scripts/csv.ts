import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export const CSV_DIR = path.join(process.cwd(), "data", "csv");

export function readCsv(name: string): Record<string, string>[] {
  const file = path.join(CSV_DIR, name);
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    throw new Error(`${name}: ${parsed.errors.map((e) => `row ${e.row}: ${e.message}`).join("; ")}`);
  }
  return parsed.data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), (v ?? "").trim()])));
}

export const list = (v: string) => (v ? v.split("|").map((s) => s.trim()).filter(Boolean) : []);
