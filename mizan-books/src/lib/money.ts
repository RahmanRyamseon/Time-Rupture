import type { Lang, Mils } from "./types";

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

/** Converts Arabic-Indic / Persian digits and Arabic separators to ASCII. */
export function normalizeDigits(s: string): string {
  let out = "";
  for (const ch of s) {
    const a = ARABIC_INDIC.indexOf(ch);
    if (a >= 0) { out += String(a); continue; }
    const p = PERSIAN.indexOf(ch);
    if (p >= 0) { out += String(p); continue; }
    if (ch === "٫") { out += "."; continue; } // Arabic decimal separator
    if (ch === "٬") { out += ","; continue; } // Arabic thousands separator
    out += ch;
  }
  return out;
}

/**
 * Parses an amount typed or scanned in English or Arabic.
 * Handles "1,234.50", "١٬٢٣٤٫٥٠", "(1,234.50)", "1234.50-", "1,234.50 CR".
 * Returns NaN when nothing numeric is found.
 */
export function parseAmount(raw: string | number | null | undefined): number {
  if (raw == null) return NaN;
  if (typeof raw === "number") return raw;
  let s = normalizeDigits(String(raw)).trim();
  if (!s) return NaN;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (/-\s*$/.test(s) || /^\s*-/.test(s) || /\bDR\b/i.test(s)) negative = true;
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return NaN;
  // European style "1.234,50" -> treat last separator as decimal when it has 2-3 trailing digits.
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot && /,\d{1,3}$/.test(s) && (s.match(/,/g) || []).length === 1 && lastDot >= 0) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  // Multiple dots: keep last as decimal.
  const parts = s.split(".");
  if (parts.length > 2) s = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

export const toMils = (n: number): Mils => Math.round(n * 1000);
export const fromMils = (m: Mils): number => m / 1000;

/** Rounds a mils value to the currency's precision (2dp currencies -> multiples of 10). */
export function roundToCurrency(m: Mils, decimals: number): Mils {
  const step = 10 ** (3 - decimals);
  return Math.round(m / step) * step;
}

export function formatMoney(m: Mils, decimals: number, lang: Lang = "en", opts: { blankZero?: boolean; parens?: boolean } = {}): string {
  if (opts.blankZero && m === 0) return "";
  const v = Math.abs(m) / 1000;
  const s = new Intl.NumberFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
  if (m < 0) return opts.parens !== false ? `(${s})` : `-${s}`;
  return s;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  يناير: 1, فبراير: 2, مارس: 3, أبريل: 4, ابريل: 4, مايو: 5, يونيو: 6, يوليو: 7, أغسطس: 8, اغسطس: 8,
  سبتمبر: 9, أكتوبر: 10, اكتوبر: 10, نوفمبر: 11, ديسمبر: 12,
};

function iso(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Parses dates as written in the GCC (day-first by default):
 * 31/01/2026, 31-01-26, 2026-01-31, 31 Jan 2026, Jan 31, 2026, ٣١/٠١/٢٠٢٦, 31 يناير 2026,
 * and Excel serial numbers.
 */
export function parseDate(raw: unknown, dayFirst = true): string | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return iso(raw.getFullYear(), raw.getMonth() + 1, raw.getDate());
  }
  if (typeof raw === "number") {
    if (raw > 20000 && raw < 80000) {
      const dt = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
      return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    }
    return null;
  }
  const s = normalizeDigits(String(raw)).trim();
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3];
    if (dayFirst || b > 12) return iso(y, b, a) ?? iso(y, a, b);
    return iso(y, a, b) ?? iso(y, b, a);
  }
  m = s.match(/(\d{1,2})[\s\-/.]*([A-Za-z؀-ۿ]{3,9})[\s\-/.,]*(\d{2,4})/);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (mo) return iso(+m[3], mo, +m[1]);
  }
  m = s.match(/([A-Za-z]{3,9})[\s.]+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()] ?? MONTHS[m[1].toLowerCase().slice(0, 3)];
    if (mo) return iso(+m[3], mo, +m[2]);
  }
  return null;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
