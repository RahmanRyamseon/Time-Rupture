import { normalizeDigits, parseAmount, parseDate } from "./money";

export interface RawTxn {
  date: string;
  description: string;
  amount: number; // + in, - out (currency units)
  balance?: number;
}

type Field = "date" | "description" | "debit" | "credit" | "amount" | "balance" | "type";

const HEADERS: Record<Field, RegExp> = {
  date: /^(txn\.?\s*|transaction\s*|trans\.?\s*|posting\s*|post\s*|value\s*|book(ing)?\s*)?date$|^date|التاريخ|تاريخ/i,
  description: /description|details|narration|particulars|remarks|memo|reference|transaction\s*details|payee|البيان|الوصف|التفاصيل|تفاصيل|ملاحظات/i,
  debit: /debit|withdraw|money\s*out|paid\s*out|outflow|payments?$|^dr\.?$|مدين|سحب|السحوبات|مسحوبات|خصم/i,
  credit: /credit|deposit|money\s*in|paid\s*in|inflow|receipts?$|^cr\.?$|دائن|إيداع|ايداع|الإيداعات|إضافة/i,
  amount: /^amount|transaction\s*amount|^المبلغ|^مبلغ/i,
  balance: /balance|الرصيد|رصيد/i,
  type: /^(dr\s*\/\s*cr|cr\s*\/\s*dr|type|txn\s*type|نوع)/i,
};

export interface ColumnMap { headerRow: number; cols: Partial<Record<Field, number>> }

/** Finds the header row and maps columns, for English and Arabic bank exports. */
export function detectColumns(rows: unknown[][]): ColumnMap | null {
  let best: ColumnMap | null = null;
  let bestScore = 0;
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const cols: Partial<Record<Field, number>> = {};
    rows[r].forEach((cell, c) => {
      const h = String(cell ?? "").trim();
      if (!h || h.length > 40) return;
      // Balance first so "Available balance" isn't read as an amount column.
      for (const f of ["balance", "date", "debit", "credit", "description", "amount", "type"] as Field[]) {
        if (cols[f] === undefined && HEADERS[f].test(h)) { cols[f] = c; break; }
      }
    });
    const score = Object.keys(cols).length;
    const usable = cols.date !== undefined && (cols.amount !== undefined || cols.debit !== undefined || cols.credit !== undefined);
    if (usable && score > bestScore) { best = { headerRow: r, cols }; bestScore = score; }
  }
  return best;
}

export function rowsToTxns(rows: unknown[][], map: ColumnMap): RawTxn[] {
  const out: RawTxn[] = [];
  const { cols } = map;
  for (let r = map.headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;
    const date = parseDate(row[cols.date!]);
    if (!date) continue;
    let amount = NaN;
    if (cols.debit !== undefined || cols.credit !== undefined) {
      const dr = cols.debit !== undefined ? parseAmount(row[cols.debit] as string) : NaN;
      const cr = cols.credit !== undefined ? parseAmount(row[cols.credit] as string) : NaN;
      if (Number.isFinite(cr) && cr !== 0) amount = Math.abs(cr);
      else if (Number.isFinite(dr) && dr !== 0) amount = -Math.abs(dr);
      else if (cols.debit !== undefined && cols.debit === cols.credit) amount = NaN;
    }
    if (!Number.isFinite(amount) && cols.amount !== undefined) {
      amount = parseAmount(row[cols.amount] as string);
      const t = cols.type !== undefined ? String(row[cols.type] ?? "") : "";
      if (Number.isFinite(amount) && /^\s*(dr|d|debit|مدين)\s*$/i.test(t)) amount = -Math.abs(amount);
      if (Number.isFinite(amount) && /^\s*(cr|c|credit|دائن)\s*$/i.test(t)) amount = Math.abs(amount);
    }
    if (!Number.isFinite(amount) || amount === 0) continue;
    const balance = cols.balance !== undefined ? parseAmount(row[cols.balance] as string) : NaN;
    const description = cols.description !== undefined
      ? String(row[cols.description] ?? "").replace(/\s+/g, " ").trim()
      : row.filter((c, i) => i !== cols.date && typeof c === "string" && !/^[\d.,\s()-]+$/.test(c)).join(" ").trim();
    out.push({ date, description: description || "—", amount, ...(Number.isFinite(balance) ? { balance } : {}) });
  }
  return out;
}

/** Splits a CSV (comma, semicolon or tab separated, quoted fields allowed). */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", ";", "\t", "|"].map((s) => [s, firstLine.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.replace(/^﻿/, "").trim()));
}

// ---------- PDF / OCR text statements ----------

const LINE_DATE = /^\s*(\d{1,2}[-/.](?:\d{1,2}|[A-Za-z]{3})[-/.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})/;
const NUM = /\(?-?\d{1,3}(?:,\d{3})*(?:\.\d{2,3})\)?(?:\s?(?:CR|DR|Cr|Dr))?|\(?-?\d+\.\d{2,3}\)?(?:\s?(?:CR|DR|Cr|Dr))?/g;
const IN_WORDS = /(credit|deposit|received|inward|salary credit|refund|reversal|transfer from|cash dep|إيداع|ايداع|تحويل وارد|دائن|استرداد)/i;
const OUT_WORDS = /(debit|withdraw|purchase|pos |payment|charge|fee|transfer to|outward|bill|atm|سحب|شراء|دفع|رسوم|تحويل صادر|مدين)/i;

/**
 * Parses statement text (from a PDF text layer or OCR) one line at a time.
 * Uses the running balance, when present, to tell money in from money out.
 */
export function parseStatementText(text: string): RawTxn[] {
  const lines = normalizeDigits(text).split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  type Work = RawTxn & { explicit?: boolean; anchor?: boolean };
  const txns: Work[] = [];
  let pending: Work | null = null;
  for (const line of lines) {
    const dm = line.match(LINE_DATE);
    if (!dm) {
      // Continuation of a multi-line narration.
      if (pending && !NUM.test(line) && line.length < 120) pending.description += " " + line;
      NUM.lastIndex = 0;
      continue;
    }
    const date = parseDate(dm[1]);
    if (!date) continue;
    let rest = line.slice(dm[0].length).trim();
    // Some banks print value date right after the transaction date.
    const vd = rest.match(LINE_DATE);
    if (vd) rest = rest.slice(vd[0].length).trim();
    const nums = [...rest.matchAll(NUM)].map((m) => m[0]);
    if (!nums.length) continue;
    const firstNumIdx = rest.indexOf(nums[0]);
    const description = rest.slice(0, firstNumIdx).trim() || rest;
    if (/opening\s*balance|balance\s*(b\/?f|brought|forward|carried)|closing\s*balance|الرصيد\s*(الافتتاحي|السابق|الختامي)|رصيد\s*(افتتاحي|سابق|ختامي)/i.test(description)) {
      // Keep as a balance anchor so the first real transaction's direction can be checked.
      const last = nums[nums.length - 1];
      txns.push({ date, description, amount: 0, balance: parseAmount(last) * (/\(|-|dr/i.test(last) ? -1 : 1), anchor: true });
      pending = null;
      continue;
    }
    const values = nums.map((n) => ({ v: Math.abs(parseAmount(n)), cr: /cr/i.test(n), dr: /dr|\(|-/i.test(n) }));
    let amount: number, balance: number | undefined, explicit = false;
    if (values.length >= 2) {
      const a = values[values.length - 2];
      balance = values[values.length - 1].v * (values[values.length - 1].dr && /\(|-/.test(nums[nums.length - 1]) ? -1 : 1);
      amount = a.v;
      if (a.cr) { explicit = true; } else if (a.dr) { amount = -amount; explicit = true; }
    } else {
      amount = values[0].v;
      if (values[0].cr) explicit = true; else if (values[0].dr) { amount = -amount; explicit = true; }
    }
    if (!explicit) {
      if (IN_WORDS.test(description) && !OUT_WORDS.test(description)) explicit = false;
      else amount = -amount; // provisional: most statement lines are payments
    }
    pending = { date, description, amount, balance, explicit };
    txns.push(pending);
  }
  // Fix signs using running balances. Statements may be printed oldest-first or
  // newest-first, so test both orders and keep the one where balances reconcile.
  const fits = (i: number, j: number) => {
    const a = txns[i], b = txns[j];
    if (a?.balance == null || b?.balance == null || a.anchor || !Number.isFinite(b.balance)) return 0;
    const delta = Math.round((a.balance - b.balance) * 1000) / 1000;
    return Math.abs(Math.abs(delta) - Math.abs(a.amount)) < 0.011 ? 1 : 0;
  };
  let fwd = 0, rev = 0;
  for (let i = 1; i < txns.length; i++) fwd += fits(i, i - 1);
  for (let i = 0; i < txns.length - 1; i++) rev += fits(i, i + 1);
  const newestFirst = rev > fwd;
  for (let i = 0; i < txns.length; i++) {
    const j = newestFirst ? i + 1 : i - 1;
    if (!fits(i, j)) continue;
    const delta = txns[i].balance! - txns[j].balance!;
    txns[i].amount = Math.sign(delta) * Math.abs(txns[i].amount);
  }
  // The oldest line has no earlier balance; its sign comes from CR/DR markers or keywords.
  return txns.filter((t) => !t.anchor).map(({ explicit: _e, anchor: _a, ...t }) => ({ ...t, description: t.description.slice(0, 200) }));
}
