import { CURRENCY_HINTS } from "./countries";
import { normalizeDigits, parseAmount, parseDate } from "./money";

export interface ExtractedInvoice {
  kind?: "purchase" | "sales";
  supplier?: string;
  supplierTrn?: string;
  customer?: string;
  customerTrn?: string;
  number?: string;
  date?: string;
  currency?: string;
  subtotal?: number;
  vat?: number;
  total?: number;
  vatRate?: number;
  /** Which fields were computed rather than read. */
  derived?: string[];
  source: "zatca-qr" | "ocr" | "ai" | "text";
  confidence: "high" | "medium" | "low";
  notes?: string[];
}

// ---------- ZATCA (KSA e-invoicing / FATOORAH) QR ----------

/**
 * Decodes the TLV payload in a Saudi simplified tax invoice QR code.
 * Tags: 1 seller name, 2 VAT number, 3 timestamp, 4 total incl. VAT, 5 VAT amount.
 */
export function decodeZatcaQr(payload: string): ExtractedInvoice | null {
  let bytes: Uint8Array;
  try {
    const bin = atob(payload.trim());
    bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
  const dec = new TextDecoder("utf-8");
  const tags: Record<number, string> = {};
  let i = 0;
  while (i + 2 <= bytes.length) {
    const tag = bytes[i];
    const len = bytes[i + 1];
    if (tag < 1 || tag > 9 || i + 2 + len > bytes.length) break;
    tags[tag] = dec.decode(bytes.slice(i + 2, i + 2 + len));
    i += 2 + len;
  }
  if (!tags[1] || !tags[4]) return null;
  const total = parseAmount(tags[4]);
  const vat = parseAmount(tags[5] ?? "0");
  if (!Number.isFinite(total)) return null;
  const subtotal = Math.round((total - (Number.isFinite(vat) ? vat : 0)) * 1000) / 1000;
  return {
    supplier: tags[1],
    supplierTrn: tags[2],
    date: parseDate(tags[3] ?? "") ?? undefined,
    currency: "SAR",
    total,
    vat: Number.isFinite(vat) ? vat : 0,
    subtotal,
    vatRate: subtotal > 0 && Number.isFinite(vat) ? Math.round((vat / subtotal) * 1000) / 10 : undefined,
    source: "zatca-qr",
    confidence: "high",
    kind: "purchase",
  };
}

// ---------- OCR text heuristics ----------

const AMOUNT_RE = /(?:\(?-?\d{1,3}(?:[,\s]\d{3})+(?:\.\d{1,3})?\)?|\(?-?\d+(?:\.\d{1,3})?\)?)/g;

const KW = {
  total: /(grand\s*total|total\s*(amount)?\s*(due|payable)?|amount\s*(due|payable)|net\s*payable|total\s*incl|invoice\s*total|balance\s*due|الإجمالي|الاجمالي|المجموع\s*الكلي|المبلغ\s*المستحق|الإجمالي\s*شامل|الصافي|المبلغ\s*الإجمالي|إجمالي\s*المبلغ)/i,
  subtotal: /(sub[\s-]*total|total\s*(excl|excluding|before|w\/o)|taxable\s*(amount|value)|net\s*of\s*vat|amount\s*before\s*vat|net\s*amount|المجموع\s*الفرعي|الإجمالي\s*(قبل|غير\s*شامل)|المبلغ\s*الخاضع|الإجمالي\s*الخاضع|القيمة\s*قبل\s*الضريبة)/i,
  vat: /(\bvat\b|\btax\b|value\s*added|ض\.?\s*ق\.?\s*م|ضريبة\s*القيمة\s*المضافة|الضريبة|ضريبة)/i,
  trn: /(trn|tax\s*reg|vat\s*(reg|no|number|#|id|in)|tax\s*(id|number|no)|الرقم\s*الضريبي|رقم\s*التسجيل\s*الضريبي|رقم\s*ضريبي|الرقم\s*الضريبى)/i,
  invNo: /(invoice\s*(no|number|#|num)|inv\.?\s*(no|#)|bill\s*(no|#)|receipt\s*(no|#)|رقم\s*الفاتورة|فاتورة\s*رقم|رقم\s*الإيصال)/i,
  date: /(invoice\s*date|date\s*of\s*(issue|supply)|issue\s*date|\bdate\b|التاريخ|تاريخ\s*الفاتورة|تاريخ\s*الإصدار)/i,
  customer: /(bill\s*to|billed\s*to|customer|client|sold\s*to|buyer|العميل|المشتري|فاتورة\s*إلى|إلى\s*السيد)/i,
  taxInvoice: /(tax\s*invoice|فاتورة\s*ضريبية|simplified\s*tax\s*invoice|فاتورة\s*ضريبية\s*مبسطة)/i,
};

function amountsIn(line: string): number[] {
  const s = normalizeDigits(line).replace(/(\d)\s(\d{3})(?!\d)/g, "$1,$2");
  const out: number[] = [];
  for (const m of s.matchAll(AMOUNT_RE)) {
    const raw = m[0];
    if (/^\d{9,}$/.test(raw.replace(/\D/g, "")) && !raw.includes(".")) continue; // phone / TRN numbers
    const n = parseAmount(raw);
    if (Number.isFinite(n) && Math.abs(n) < 1e10) out.push(Math.abs(n));
  }
  return out;
}

/** Amount on the keyword's line, or the next line if the label stands alone. */
function amountNear(lines: string[], re: RegExp, exclude?: RegExp): number | undefined {
  const found: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (!re.test(ln) || (exclude && exclude.test(ln))) continue;
    // Ignore percentage numbers like "VAT 5%".
    const cleaned = normalizeDigits(ln).replace(/\d+(\.\d+)?\s*%/g, " ");
    let a = amountsIn(cleaned).filter((n) => n !== 0 || /0\.00/.test(cleaned));
    if (!a.length && lines[i + 1]) a = amountsIn(normalizeDigits(lines[i + 1]).replace(/\d+(\.\d+)?\s*%/g, " "));
    if (a.length) found.push(a[a.length - 1]);
  }
  if (!found.length) return undefined;
  return found[found.length - 1]; // totals usually appear at the bottom
}

function findTrns(text: string): string[] {
  const t = normalizeDigits(text);
  const out: string[] = [];
  for (const m of t.matchAll(/\b(\d[\d\s-]{13,20}\d)\b/g)) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length === 15 && !out.includes(digits)) out.push(digits);
  }
  return out;
}

function detectCurrency(text: string): string | undefined {
  let best: { code: string; count: number } | undefined;
  for (const [re, code] of CURRENCY_HINTS) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    const count = (text.match(g) || []).length;
    if (count && (!best || count > best.count)) best = { code, count };
  }
  return best?.code;
}

function valueAfterLabel(lines: string[], re: RegExp, valueRe: RegExp): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    const ln = normalizeDigits(lines[i]);
    const m = ln.match(re);
    if (!m) continue;
    const after = ln.slice((m.index ?? 0) + m[0].length);
    const v = after.match(valueRe) ?? ln.slice(0, m.index).match(valueRe) ?? (lines[i + 1] ? normalizeDigits(lines[i + 1]).match(valueRe) : null);
    if (v) return v[1] ?? v[0];
  }
  return undefined;
}

const NOISE_LINE = /(tax\s*invoice|invoice|فاتورة|receipt|إيصال|page|صفحة|tel|phone|هاتف|fax|p\.?o\.?\s*box|ص\.?\s*ب|www\.|@|trn|vat|الرقم الضريبي|date|التاريخ|^[\s\p{P}\p{S}]*$)/iu;

/**
 * Best-effort extraction from OCR or PDF text of an English and/or Arabic invoice.
 * Cross-checks subtotal + VAT = total and fills in whichever is missing.
 */
export function parseInvoiceText(text: string, defaultVatRate: number, ownTrn?: string): ExtractedInvoice {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const notes: string[] = [];
  const derived: string[] = [];

  const total = amountNear(lines, KW.total, new RegExp(`${KW.subtotal.source}|^(?!.*(incl|inclusive|including|with\\s*vat|شامل)).*(\\bvat\\b|\\btax\\b|ضريبة)`, "i"));
  const subtotal = amountNear(lines, KW.subtotal);
  let vat = amountNear(lines, KW.vat, new RegExp(`${KW.total.source}|${KW.subtotal.source}|${KW.trn.source}`, "i"));

  let net = subtotal, gross = total;
  // A "VAT" match that equals the total or subtotal is a header line, not the tax amount.
  if (vat != null && (vat === gross || vat === net)) vat = undefined;
  if (gross == null && net != null && vat != null) { gross = round3(net + vat); derived.push("total"); }
  if (net == null && gross != null && vat != null) { net = round3(gross - vat); derived.push("subtotal"); }
  if (vat == null && gross != null && net != null) { vat = round3(gross - net); derived.push("vat"); }
  if (gross == null && net == null) {
    // Fall back to the largest amount on the page.
    const all = lines.flatMap((l) => amountsIn(l.replace(/\d+(\.\d+)?\s*%/g, " ")));
    const max = all.length ? Math.max(...all) : undefined;
    if (max) { gross = max; derived.push("total"); notes.push("totalGuessed"); }
  }
  if (gross != null && net == null && vat == null) {
    if (defaultVatRate > 0 && KW.taxInvoice.test(text)) {
      net = round3(gross / (1 + defaultVatRate / 100));
      vat = round3(gross - net);
      derived.push("subtotal", "vat");
      notes.push("vatAssumed");
    } else {
      net = gross; vat = 0;
    }
  }
  let vatRate: number | undefined;
  if (net && vat != null) vatRate = Math.round((vat / net) * 1000) / 10;
  if (net != null && vat != null && gross != null && Math.abs(net + vat - gross) > 0.011) notes.push("totalsMismatch");

  const pct = normalizeDigits(text).match(/(?:vat|ضريبة)[^\n%]{0,20}?(\d{1,2}(?:\.\d+)?)\s*%/i) ?? normalizeDigits(text).match(/(\d{1,2}(?:\.\d+)?)\s*%/);
  if (pct && vatRate == null) vatRate = Number(pct[1]);

  const trns = findTrns(text).filter((t) => t !== ownTrn);
  const number = valueAfterLabel(lines, KW.invNo, /[:#\s]*([A-Za-z0-9][A-Za-z0-9/_-]{1,24})/);
  const dateRaw = valueAfterLabel(lines, KW.date, /(\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s+[A-Za-z؀-ۿ]{3,9}\s+\d{2,4})/);
  let date = dateRaw ? parseDate(dateRaw) : null;
  if (!date) {
    const any = normalizeDigits(text).match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}-\d{2}-\d{2})\b/);
    if (any) date = parseDate(any[1]);
  }

  const supplier = lines.slice(0, 8).find((l) => !NOISE_LINE.test(l) && /[A-Za-z؀-ۿ]{3,}/.test(l) && amountsIn(l).length === 0);
  const customer = valueAfterLabel(lines, KW.customer, /[:\s-]*([^\d:][^:]{2,60})$/);

  // When no currency symbol was read, a supplier VAT number's format often tells the country:
  // Saudi VAT numbers are 15 digits starting and ending with 3; UAE TRNs start with 100.
  const currency = detectCurrency(text) ?? (trns[0] && /^3\d{13}3$/.test(trns[0]) ? "SAR" : trns[0]?.startsWith("100") ? "AED" : undefined);
  const ownTrnOnInvoice = ownTrn && normalizeDigits(text).replace(/\D/g, "").includes(ownTrn);

  let found = 0;
  for (const v of [gross, date, number, supplier]) if (v) found++;
  const confidence: ExtractedInvoice["confidence"] =
    found >= 4 && !notes.includes("totalsMismatch") && !notes.includes("totalGuessed") ? "high" : found >= 2 ? "medium" : "low";

  return {
    supplier: supplier?.slice(0, 80),
    supplierTrn: trns[0],
    customer: customer?.trim().slice(0, 80),
    customerTrn: trns[1],
    number,
    date: date ?? undefined,
    currency,
    subtotal: net,
    vat,
    total: gross,
    vatRate,
    derived,
    source: "ocr",
    confidence,
    notes,
    ...(ownTrnOnInvoice ? { kind: "purchase" as const } : {}),
  };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
