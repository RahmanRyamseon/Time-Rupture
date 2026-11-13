import { SYS } from "./coa";
import type { Account, Books, JournalEntry, JournalLine, Mils, TaxInfo } from "./types";

// ---------- validation ----------

export function entryTotals(e: Pick<JournalEntry, "lines">): { debit: Mils; credit: Mils } {
  let debit = 0, credit = 0;
  for (const l of e.lines) { debit += l.debit; credit += l.credit; }
  return { debit, credit };
}

export function validateEntry(e: Pick<JournalEntry, "lines" | "date">, accounts: Account[]): string[] {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) errors.push("invalidDate");
  const codes = new Set(accounts.map((a) => a.code));
  const lines = e.lines.filter((l) => l.debit !== 0 || l.credit !== 0);
  if (lines.length < 2) errors.push("needTwoLines");
  for (const l of lines) {
    if (!codes.has(l.account)) errors.push("unknownAccount");
    if (l.debit < 0 || l.credit < 0) errors.push("negativeAmount");
    if (l.debit > 0 && l.credit > 0) errors.push("bothSides");
  }
  const t = entryTotals({ lines });
  if (t.debit !== t.credit) errors.push("unbalanced");
  if (t.debit === 0) errors.push("zeroEntry");
  return [...new Set(errors)];
}

// ---------- posting builders ----------

export type Settlement = "credit" | "bank" | "cash";

export interface InvoiceDraft {
  kind: "purchase" | "sales";
  date: string;
  number: string;
  party: string;
  partyTrn: string;
  /** Amounts in base currency mils. */
  net: Mils;
  vat: Mils;
  vatRate: number;
  account: string; // expense / asset account for purchases, revenue account for sales
  settlement: Settlement;
  memo?: string;
  attachment?: string;
  fx?: JournalEntry["fx"];
}

const settlementAccount = (kind: InvoiceDraft["kind"], s: Settlement) =>
  s === "bank" ? SYS.bank : s === "cash" ? SYS.cash : kind === "purchase" ? SYS.ap : SYS.ar;

export function invoiceToEntry(d: InvoiceDraft, id: string, now: string): JournalEntry {
  const total = d.net + d.vat;
  const contra = settlementAccount(d.kind, d.settlement);
  const lines: JournalLine[] =
    d.kind === "purchase"
      ? [
          { account: d.account, debit: d.net, credit: 0 },
          ...(d.vat ? [{ account: SYS.vatIn, debit: d.vat, credit: 0 }] : []),
          { account: contra, debit: 0, credit: total },
        ]
      : [
          { account: contra, debit: total, credit: 0 },
          { account: d.account, debit: 0, credit: d.net },
          ...(d.vat ? [{ account: SYS.vatOut, debit: 0, credit: d.vat }] : []),
        ];
  const tax: TaxInfo = { kind: d.kind, net: d.net, vat: d.vat, rate: d.vatRate, ...(d.partyTrn ? { partyTrn: d.partyTrn } : {}) };
  return {
    id, date: d.date, ref: d.number || undefined,
    memo: d.memo || `${d.kind === "purchase" ? "Purchase" : "Sale"}${d.party ? ` – ${d.party}` : ""}`,
    party: d.party || undefined, source: "invoice", lines, tax,
    attachment: d.attachment, fx: d.fx, createdAt: now,
  };
}

export interface BankLine {
  id: string;
  date: string;
  description: string;
  /** Positive = money in, negative = money out (mils). */
  amount: Mils;
  balance?: Mils;
  account: string;
  /** When true the line is treated as VAT-inclusive at the given rate. */
  withVat: boolean;
  include: boolean;
}

export function bankLineToEntry(l: BankLine, bankAccount: string, vatRate: number, id: string, now: string): JournalEntry {
  const gross = Math.abs(l.amount);
  const inflow = l.amount > 0;
  let vat = 0;
  if (l.withVat && vatRate > 0) vat = Math.round((gross * vatRate) / (100 + vatRate));
  const net = gross - vat;
  const lines: JournalLine[] = inflow
    ? [
        { account: bankAccount, debit: gross, credit: 0 },
        { account: l.account, debit: 0, credit: net },
        ...(vat ? [{ account: SYS.vatOut, debit: 0, credit: vat }] : []),
      ]
    : [
        { account: l.account, debit: net, credit: 0 },
        ...(vat ? [{ account: SYS.vatIn, debit: vat, credit: 0 }] : []),
        { account: bankAccount, debit: 0, credit: gross },
      ];
  return {
    id, date: l.date, memo: l.description, source: "bank", lines, createdAt: now,
    ...(vat ? { tax: { kind: inflow ? "sales" : "purchase", net, vat, rate: vatRate } as TaxInfo } : {}),
  };
}

// ---------- balances ----------

/** Debit-positive balance per account for entries matching the filter. */
export function balances(entries: JournalEntry[], filter: (e: JournalEntry) => boolean): Map<string, Mils> {
  const m = new Map<string, Mils>();
  for (const e of entries) {
    if (!filter(e)) continue;
    for (const l of e.lines) m.set(l.account, (m.get(l.account) ?? 0) + l.debit - l.credit);
  }
  return m;
}

const isPL = (a: Account | undefined) => a?.type === "revenue" || a?.type === "expense";

export interface Period { from: string; to: string }

export interface TBRow {
  account: Account;
  opening: Mils;
  debit: Mils;
  credit: Mils;
  closing: Mils;
}

/**
 * Trial balance for a period. Profit or loss earned before `from` is closed
 * into retained earnings, so P&L accounts open at zero and the balance sheet
 * still balances.
 */
export function trialBalance(books: Books, p: Period): { rows: TBRow[]; totals: { opening: Mils; debit: Mils; credit: Mils; closingDr: Mils; closingCr: Mils } } {
  const byCode = new Map(books.accounts.map((a) => [a.code, a]));
  const open = balances(books.entries, (e) => e.date < p.from);
  let priorProfit = 0;
  for (const [code, v] of [...open]) {
    if (isPL(byCode.get(code))) { priorProfit += v; open.delete(code); }
  }
  if (priorProfit) open.set(SYS.retained, (open.get(SYS.retained) ?? 0) + priorProfit);

  const dr = new Map<string, Mils>(), cr = new Map<string, Mils>();
  for (const e of books.entries) {
    if (e.date < p.from || e.date > p.to) continue;
    for (const l of e.lines) {
      dr.set(l.account, (dr.get(l.account) ?? 0) + l.debit);
      cr.set(l.account, (cr.get(l.account) ?? 0) + l.credit);
    }
  }
  const codes = new Set([...open.keys(), ...dr.keys(), ...cr.keys()]);
  const rows: TBRow[] = [];
  for (const code of codes) {
    const account = byCode.get(code) ?? { code, name: `Unknown ${code}`, nameAr: `حساب غير معروف ${code}`, type: "asset", subtype: "suspense", cf: "operating" } as Account;
    const opening = open.get(code) ?? 0, debit = dr.get(code) ?? 0, credit = cr.get(code) ?? 0;
    const closing = opening + debit - credit;
    if (opening || debit || credit) rows.push({ account, opening, debit, credit, closing });
  }
  rows.sort((a, b) => a.account.code.localeCompare(b.account.code, "en", { numeric: true }));
  const totals = { opening: 0, debit: 0, credit: 0, closingDr: 0, closingCr: 0 };
  for (const r of rows) {
    totals.opening += r.opening; totals.debit += r.debit; totals.credit += r.credit;
    if (r.closing > 0) totals.closingDr += r.closing; else totals.closingCr -= r.closing;
  }
  return { rows, totals };
}

// ---------- financial statements ----------

export interface Line { code?: string; label: string; labelAr: string; amount: Mils; bold?: boolean; indent?: number; kind?: "header" | "subtotal" | "total" }

const L = (label: string, labelAr: string, amount: Mils, extra: Partial<Line> = {}): Line => ({ label, labelAr, amount, ...extra });

function accountLines(rows: TBRow[], pick: (a: Account) => boolean, sign: 1 | -1, use: (r: TBRow) => Mils): { lines: Line[]; total: Mils } {
  const lines: Line[] = [];
  let total = 0;
  for (const r of rows) {
    if (!pick(r.account)) continue;
    const v = sign * use(r);
    if (!v) continue;
    total += v;
    lines.push(L(r.account.name, r.account.nameAr, v, { code: r.account.code, indent: 1 }));
  }
  return { lines, total };
}

export interface IncomeStatement {
  lines: Line[];
  revenue: Mils; grossProfit: Mils; operatingProfit: Mils; profitBeforeTax: Mils; netProfit: Mils;
}

export function incomeStatement(books: Books, p: Period): IncomeStatement {
  const { rows } = trialBalance(books, p);
  const mv = (r: TBRow) => r.debit - r.credit;
  const rev = accountLines(rows, (a) => a.subtype === "revenue", -1, mv);
  const cogs = accountLines(rows, (a) => a.subtype === "cogs", 1, mv);
  const opex = accountLines(rows, (a) => a.subtype === "expense", 1, mv);
  const other = accountLines(rows, (a) => a.subtype === "other_income", -1, mv);
  const fin = accountLines(rows, (a) => a.subtype === "finance_cost", 1, mv);
  const tax = accountLines(rows, (a) => a.subtype === "tax", 1, mv);
  const gross = rev.total - cogs.total;
  const op = gross - opex.total;
  const pbt = op + other.total - fin.total;
  const net = pbt - tax.total;
  const lines: Line[] = [
    L("Revenue", "الإيرادات", 0, { kind: "header" }), ...rev.lines, L("Total revenue", "إجمالي الإيرادات", rev.total, { kind: "subtotal" }),
    L("Cost of sales", "تكلفة المبيعات", 0, { kind: "header" }), ...cogs.lines.map((l) => ({ ...l, amount: -l.amount })), L("Total cost of sales", "إجمالي تكلفة المبيعات", -cogs.total, { kind: "subtotal" }),
    L("Gross profit", "مجمل الربح", gross, { kind: "total" }),
    L("Operating expenses", "المصروفات التشغيلية", 0, { kind: "header" }), ...opex.lines.map((l) => ({ ...l, amount: -l.amount })), L("Total operating expenses", "إجمالي المصروفات التشغيلية", -opex.total, { kind: "subtotal" }),
    L("Operating profit", "الربح التشغيلي", op, { kind: "total" }),
    ...other.lines, ...fin.lines.map((l) => ({ ...l, amount: -l.amount })),
    L("Profit before tax / Zakat", "الربح قبل الضريبة / الزكاة", pbt, { kind: "total" }),
    ...tax.lines.map((l) => ({ ...l, amount: -l.amount })),
    L("Net profit for the period", "صافي ربح الفترة", net, { kind: "total", bold: true }),
  ];
  return { lines, revenue: rev.total, grossProfit: gross, operatingProfit: op, profitBeforeTax: pbt, netProfit: net };
}

export interface BalanceSheet {
  lines: Line[];
  totalAssets: Mils; totalLiabilities: Mils; totalEquity: Mils; difference: Mils;
}

export function balanceSheet(books: Books, p: Period): BalanceSheet {
  const { rows } = trialBalance(books, p);
  const bal = (r: TBRow) => r.closing;
  const profit = incomeStatement(books, p).netProfit;
  const isSuspDr = (a: Account, r?: TBRow) => a.subtype === "suspense" && (r ? r.closing > 0 : true);
  const rowsBy = (pick: (r: TBRow) => boolean) => rows.filter(pick);

  const cash = accountLines(rows, (a) => a.subtype === "cash", 1, bal);
  const ca = accountLines(rowsBy((r) => r.account.subtype === "current_asset" || isSuspDr(r.account, r)), () => true, 1, bal);
  const nca = accountLines(rows, (a) => a.subtype === "non_current_asset" || a.subtype === "contra_asset", 1, bal);
  const cl = accountLines(rowsBy((r) => r.account.subtype === "current_liability" || (r.account.subtype === "suspense" && r.closing < 0)), () => true, -1, bal);
  const ncl = accountLines(rows, (a) => a.subtype === "non_current_liability", -1, bal);
  const eq = accountLines(rows, (a) => a.type === "equity", -1, bal);

  const totalCA = cash.total + ca.total;
  const totalAssets = totalCA + nca.total;
  const totalLiab = cl.total + ncl.total;
  const totalEquity = eq.total + profit;
  const lines: Line[] = [
    L("ASSETS", "الأصول", 0, { kind: "header" }),
    L("Non-current assets", "الأصول غير المتداولة", 0, { kind: "header", indent: 1 }), ...nca.lines,
    L("Total non-current assets", "إجمالي الأصول غير المتداولة", nca.total, { kind: "subtotal" }),
    L("Current assets", "الأصول المتداولة", 0, { kind: "header", indent: 1 }), ...ca.lines, ...cash.lines,
    L("Total current assets", "إجمالي الأصول المتداولة", totalCA, { kind: "subtotal" }),
    L("TOTAL ASSETS", "إجمالي الأصول", totalAssets, { kind: "total", bold: true }),
    L("EQUITY AND LIABILITIES", "حقوق الملكية والالتزامات", 0, { kind: "header" }),
    L("Equity", "حقوق الملكية", 0, { kind: "header", indent: 1 }), ...eq.lines,
    L("Profit for the period", "ربح الفترة", profit, { indent: 1 }),
    L("Total equity", "إجمالي حقوق الملكية", totalEquity, { kind: "subtotal" }),
    L("Non-current liabilities", "الالتزامات غير المتداولة", 0, { kind: "header", indent: 1 }), ...ncl.lines,
    L("Total non-current liabilities", "إجمالي الالتزامات غير المتداولة", ncl.total, { kind: "subtotal" }),
    L("Current liabilities", "الالتزامات المتداولة", 0, { kind: "header", indent: 1 }), ...cl.lines,
    L("Total current liabilities", "إجمالي الالتزامات المتداولة", cl.total, { kind: "subtotal" }),
    L("TOTAL EQUITY AND LIABILITIES", "إجمالي حقوق الملكية والالتزامات", totalEquity + totalLiab, { kind: "total", bold: true }),
  ];
  return { lines, totalAssets, totalLiabilities: totalLiab, totalEquity, difference: totalAssets - totalEquity - totalLiab };
}

export interface CashFlow { lines: Line[]; netChange: Mils; opening: Mils; closing: Mils; check: Mils }

/** Indirect-method cash flow statement derived from balance-sheet movements. */
export function cashFlow(books: Books, p: Period): CashFlow {
  const { rows } = trialBalance(books, p);
  const profit = incomeStatement(books, p).netProfit;
  const mv = (r: TBRow) => -(r.closing - r.opening); // cash effect of a non-cash account's movement
  const nonCashAddBacks = accountLines(rows, (a) => a.subtype === "contra_asset" || (a.subtype === "non_current_liability" && a.cf === "operating"), 1, mv);
  const wc = accountLines(rows, (a) => a.cf === "operating" && a.subtype !== "contra_asset" && a.subtype !== "non_current_liability", 1, mv);
  const inv = accountLines(rows, (a) => a.cf === "investing", 1, mv);
  const fin = accountLines(rows, (a) => a.cf === "financing" && a.code !== SYS.retained, 1, mv);
  // Retained earnings movement within the period (e.g. dividends booked directly) is financing.
  const re = rows.find((r) => r.account.code === SYS.retained);
  const reMove = re ? mv(re) : 0;
  const operating = profit + nonCashAddBacks.total + wc.total;
  const financing = fin.total + reMove;
  const netChange = operating + inv.total + financing;
  const cashRows = rows.filter((r) => r.account.subtype === "cash");
  const opening = cashRows.reduce((s, r) => s + r.opening, 0);
  const closing = cashRows.reduce((s, r) => s + r.closing, 0);
  const lines: Line[] = [
    L("Cash flows from operating activities", "التدفقات النقدية من الأنشطة التشغيلية", 0, { kind: "header" }),
    L("Net profit for the period", "صافي ربح الفترة", profit, { indent: 1 }),
    L("Adjustments for non-cash items:", "تسويات لبنود غير نقدية:", 0, { kind: "header", indent: 1 }), ...nonCashAddBacks.lines,
    L("Changes in working capital:", "التغيرات في رأس المال العامل:", 0, { kind: "header", indent: 1 }), ...wc.lines,
    L("Net cash from operating activities", "صافي النقد من الأنشطة التشغيلية", operating, { kind: "subtotal" }),
    L("Cash flows from investing activities", "التدفقات النقدية من الأنشطة الاستثمارية", 0, { kind: "header" }), ...inv.lines,
    L("Net cash used in investing activities", "صافي النقد من الأنشطة الاستثمارية", inv.total, { kind: "subtotal" }),
    L("Cash flows from financing activities", "التدفقات النقدية من الأنشطة التمويلية", 0, { kind: "header" }), ...fin.lines,
    ...(reMove ? [L("Retained earnings movements", "حركات الأرباح المحتجزة", reMove, { indent: 1 })] : []),
    L("Net cash from financing activities", "صافي النقد من الأنشطة التمويلية", financing, { kind: "subtotal" }),
    L("Net change in cash and bank", "صافي التغير في النقد والبنك", netChange, { kind: "total" }),
    L("Cash and bank at beginning of period", "النقد والبنك في بداية الفترة", opening),
    L("Cash and bank at end of period", "النقد والبنك في نهاية الفترة", closing, { kind: "total", bold: true }),
  ];
  return { lines, netChange, opening, closing, check: opening + netChange - closing };
}

// ---------- VAT ----------

export interface VatSummary {
  salesNet: Mils; outputVat: Mils; purchasesNet: Mils; inputVat: Mils;
  outputLedger: Mils; inputLedger: Mils; netPayable: Mils;
  entries: JournalEntry[];
}

export function vatSummary(books: Books, p: Period): VatSummary {
  const inP = books.entries.filter((e) => e.date >= p.from && e.date <= p.to);
  let salesNet = 0, outputVat = 0, purchasesNet = 0, inputVat = 0;
  for (const e of inP) {
    if (!e.tax) continue;
    if (e.tax.kind === "sales") { salesNet += e.tax.net; outputVat += e.tax.vat; }
    else { purchasesNet += e.tax.net; inputVat += e.tax.vat; }
  }
  const b = balances(inP, () => true);
  const outputLedger = -(b.get(SYS.vatOut) ?? 0);
  const inputLedger = b.get(SYS.vatIn) ?? 0;
  return {
    salesNet, outputVat, purchasesNet, inputVat, outputLedger, inputLedger,
    netPayable: outputVat - inputVat,
    entries: inP.filter((e) => e.tax),
  };
}

// ---------- general ledger ----------

export interface GLRow { entry: JournalEntry; line: JournalLine; running: Mils }

export function generalLedger(books: Books, code: string, p: Period): { opening: Mils; rows: GLRow[]; closing: Mils } {
  const tb = trialBalance(books, p);
  const opening = tb.rows.find((r) => r.account.code === code)?.opening ?? 0;
  let running = opening;
  const rows: GLRow[] = [];
  const sorted = books.entries.filter((e) => e.date >= p.from && e.date <= p.to).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  for (const entry of sorted) {
    for (const line of entry.lines) {
      if (line.account !== code) continue;
      running += line.debit - line.credit;
      rows.push({ entry, line, running });
    }
  }
  return { opening, rows, closing: running };
}

// ---------- periods ----------

export function financialYear(fyStartMonth: number, ref: string): Period {
  const [y, m] = ref.split("-").map(Number);
  const startYear = m >= fyStartMonth ? y : y - 1;
  const from = `${startYear}-${String(fyStartMonth).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(startYear + 1, fyStartMonth - 1, 0));
  const to = end.toISOString().slice(0, 10);
  return { from, to };
}
