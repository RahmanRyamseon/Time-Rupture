import { describe, expect, it } from "vitest";
import { classify, defaultAccounts, defaultRules, SYS } from "./coa";
import { bankLineToEntry, balanceSheet, cashFlow, financialYear, incomeStatement, invoiceToEntry, trialBalance, validateEntry, vatSummary } from "./ledger";
import { normalizeDigits, parseAmount, parseDate, toMils } from "./money";
import { decodeZatcaQr, parseInvoiceText } from "./invoiceParser";
import { detectColumns, parseCsv, parseStatementText, rowsToTxns } from "./bankParser";
import type { Books, JournalEntry } from "./types";

const now = "2026-01-01T00:00:00Z";
function books(entries: JournalEntry[]): Books {
  return {
    version: 1,
    company: { id: "c", name: "Test", nameAr: "", trn: "", country: "AE", currency: "AED", fyStartMonth: 1, vatRegistered: true },
    accounts: defaultAccounts(), entries, rules: defaultRules(),
  };
}
const je = (id: string, date: string, lines: [string, number, number][]): JournalEntry => ({
  id, date, memo: id, source: "manual", createdAt: now,
  lines: lines.map(([account, d, c]) => ({ account, debit: toMils(d), credit: toMils(c) })),
});

describe("numbers & dates", () => {
  it("normalizes Arabic digits", () => {
    expect(normalizeDigits("١٢٣٫٤٥")).toBe("123.45");
    expect(parseAmount("١٬٢٣٤٫٥٠")).toBe(1234.5);
    expect(parseAmount("(1,234.50)")).toBe(-1234.5);
    expect(parseAmount("1.234,50")).toBe(1234.5);
    expect(parseAmount("AED 2,500.000")).toBe(2500);
  });
  it("parses GCC date formats", () => {
    expect(parseDate("31/01/2026")).toBe("2026-01-31");
    expect(parseDate("05/03/26")).toBe("2026-03-05");
    expect(parseDate("2026-02-28")).toBe("2026-02-28");
    expect(parseDate("12 Mar 2026")).toBe("2026-03-12");
    expect(parseDate("١٥ يناير ٢٠٢٦")).toBe("2026-01-15");
    expect(parseDate(46023)).toBe("2026-01-01");
  });
});

describe("ledger", () => {
  const entries = [
    je("cap", "2026-01-01", [["1010", 100000, 0], ["3000", 0, 100000]]),
    invoiceToEntry({ kind: "sales", date: "2026-01-10", number: "S1", party: "Cust", partyTrn: "", net: toMils(10000), vat: toMils(500), vatRate: 5, account: "4000", settlement: "credit" }, "s1", now),
    invoiceToEntry({ kind: "purchase", date: "2026-01-12", number: "P1", party: "Sup", partyTrn: "", net: toMils(4000), vat: toMils(200), vatRate: 5, account: "6100", settlement: "bank" }, "p1", now),
    je("ppe", "2026-02-01", [["1500", 12000, 0], ["1010", 0, 12000]]),
    je("dep", "2026-02-28", [["6900", 1000, 0], ["1550", 0, 1000]]),
    je("rcpt", "2026-03-01", [["1010", 5000, 0], ["1100", 0, 5000]]),
    je("old", "2025-06-01", [["1010", 3000, 0], ["4000", 0, 3000]]),
  ];
  const b = books(entries);
  const p = { from: "2026-01-01", to: "2026-12-31" };

  it("validates entries", () => {
    expect(validateEntry(je("x", "2026-01-01", [["1010", 1, 0], ["4000", 0, 2]]), b.accounts)).toContain("unbalanced");
    expect(validateEntry(entries[0], b.accounts)).toEqual([]);
  });
  it("trial balance balances and closes prior profit to retained earnings", () => {
    const tb = trialBalance(b, p);
    expect(tb.totals.closingDr).toBe(tb.totals.closingCr);
    expect(tb.rows.find((r) => r.account.code === SYS.retained)?.opening).toBe(toMils(-3000));
    expect(tb.rows.find((r) => r.account.code === "4000")?.opening ?? 0).toBe(0);
  });
  it("income statement, balance sheet and cash flow tie out", () => {
    const is = incomeStatement(b, p);
    expect(is.netProfit).toBe(toMils(10000 - 4000 - 1000));
    const bs = balanceSheet(b, p);
    expect(bs.difference).toBe(0);
    const cf = cashFlow(b, p);
    expect(cf.check).toBe(0);
    expect(cf.closing).toBe(toMils(3000 + 100000 - 4200 - 12000 + 5000));
  });
  it("VAT summary", () => {
    const v = vatSummary(b, p);
    expect(v.outputVat).toBe(toMils(500));
    expect(v.inputVat).toBe(toMils(200));
    expect(v.netPayable).toBe(toMils(300));
    expect(v.outputLedger).toBe(v.outputVat);
  });
  it("bank line with VAT splits correctly", () => {
    const e = bankLineToEntry({ id: "1", date: "2026-01-05", description: "DEWA", amount: toMils(-105), account: "6200", withVat: true, include: true }, SYS.bank, 5, "b1", now);
    expect(e.lines.find((l) => l.account === SYS.vatIn)?.debit).toBe(toMils(5));
    expect(validateEntry(e, b.accounts)).toEqual([]);
  });
  it("financial year", () => {
    expect(financialYear(4, "2026-02-10")).toEqual({ from: "2025-04-01", to: "2026-03-31" });
    expect(financialYear(1, "2026-02-10")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});

describe("classification", () => {
  const rules = defaultRules();
  it("maps GCC merchants", () => {
    expect(classify("POS PURCHASE ADNOC STATION 123 DUBAI", rules)).toBe("6300");
    expect(classify("DEWA BILL PAYMENT", rules)).toBe("6200");
    expect(classify("تحويل رواتب شهر يناير", rules)).toBe("6000");
    expect(classify("Abdul Rahman transfer", rules)).toBeNull();
  });
  it("learned rules win", () => {
    expect(classify("ADNOC fleet", [...rules, { keyword: "adnoc fleet", account: "6700", learned: true }])).toBe("6700");
  });
});

describe("invoice parsing", () => {
  it("reads an English tax invoice", () => {
    const text = `Al Noor Trading LLC
TAX INVOICE
TRN: 100234567800003
Invoice No: INV-2026-0042
Date: 14/02/2026
Bill To: Mizan Test Co
Description Qty Rate Amount
Printer paper 10 25.00 250.00
Toner 2 375.00 750.00
Subtotal 1,000.00
VAT 5% 50.00
Total Amount Due AED 1,050.00`;
    const r = parseInvoiceText(text, 5);
    expect(r.supplier).toBe("Al Noor Trading LLC");
    expect(r.supplierTrn).toBe("100234567800003");
    expect(r.number).toBe("INV-2026-0042");
    expect(r.date).toBe("2026-02-14");
    expect(r.subtotal).toBe(1000);
    expect(r.vat).toBe(50);
    expect(r.total).toBe(1050);
    expect(r.currency).toBe("AED");
    expect(r.confidence).toBe("high");
  });
  it("reads an Arabic tax invoice with Arabic-Indic digits", () => {
    const text = `مؤسسة الريان للمقاولات
فاتورة ضريبية
الرقم الضريبي: ٣٠٠١٢٣٤٥٦٧٨٩٠٠٣
رقم الفاتورة: ٧٨٩
التاريخ: ٢٠/٠٣/٢٠٢٦
المجموع الفرعي ٢٬٠٠٠٫٠٠
ضريبة القيمة المضافة ١٥٪ ٣٠٠٫٠٠
الإجمالي شامل الضريبة ٢٬٣٠٠٫٠٠ ر.س`;
    const r = parseInvoiceText(text, 15);
    expect(r.supplier).toBe("مؤسسة الريان للمقاولات");
    expect(r.supplierTrn).toBe("300123456789003");
    expect(r.number).toBe("789");
    expect(r.date).toBe("2026-03-20");
    expect(r.subtotal).toBe(2000);
    expect(r.vat).toBe(300);
    expect(r.total).toBe(2300);
    expect(r.currency).toBe("SAR");
  });
  it("decodes a ZATCA QR", () => {
    const enc = new TextEncoder();
    const parts: [number, string][] = [[1, "شركة الاختبار"], [2, "310122393500003"], [3, "2026-01-15T10:30:00Z"], [4, "1150.00"], [5, "150.00"]];
    const bytes: number[] = [];
    for (const [t, v] of parts) { const b = enc.encode(v); bytes.push(t, b.length, ...b); }
    const b64 = btoa(String.fromCharCode(...bytes));
    const r = decodeZatcaQr(b64)!;
    expect(r.supplier).toBe("شركة الاختبار");
    expect(r.total).toBe(1150);
    expect(r.subtotal).toBe(1000);
    expect(r.vatRate).toBe(15);
    expect(r.date).toBe("2026-01-15");
  });
});

describe("bank statements", () => {
  it("maps CSV columns in English", () => {
    const rows = parseCsv(`Account statement\nDate,Description,Debit,Credit,Balance\n01/02/2026,"DEWA, bill",420.00,,9580.00\n02/02/2026,Customer transfer,,1500.00,11080.00`);
    const map = detectColumns(rows)!;
    const t = rowsToTxns(rows, map);
    expect(t).toEqual([
      { date: "2026-02-01", description: "DEWA, bill", amount: -420, balance: 9580 },
      { date: "2026-02-02", description: "Customer transfer", amount: 1500, balance: 11080 },
    ]);
  });
  it("maps Arabic headers", () => {
    const rows = [["التاريخ", "البيان", "مدين", "دائن", "الرصيد"], ["٠٥/٠١/٢٠٢٦", "رسوم بنكية", "٢٥٫٠٠", "", "٩٧٥٫٠٠"]];
    const t = rowsToTxns(rows, detectColumns(rows)!);
    expect(t[0]).toEqual({ date: "2026-01-05", description: "رسوم بنكية", amount: -25, balance: 975 });
  });
  it("parses statement text using running balances", () => {
    const text = `Statement of account
01/03/2026 Opening balance 10,000.00
02/03/2026 TRANSFER FROM ABC TRADING 2,500.00 12,500.00
03/03/2026 POS ADNOC 150.00 12,350.00
05/03/2026 Inward remittance REF 99812 1,000.00 13,350.00`;
    const t = parseStatementText(text);
    expect(t.map((x) => x.amount)).toEqual([2500, -150, 1000]);
  });
  it("handles newest-first statements", () => {
    const text = `05/03/2026 Cheque deposit 1,000.00 13,350.00
03/03/2026 Card purchase 150.00 12,350.00
02/03/2026 Something 2,500.00 12,500.00
01/03/2026 Opening balance 10,000.00`;
    expect(parseStatementText(text).map((x) => x.amount)).toEqual([1000, -150, 2500]);
  });
});

describe("sample books", async () => {
  const { demoBooks } = await import("./demo");
  it("balance and are profitable", () => {
    const b = demoBooks(2026);
    const p = { from: "2026-01-01", to: "2026-12-31" };
    expect(balanceSheet(b, p).difference).toBe(0);
    expect(cashFlow(b, p).check).toBe(0);
    expect(incomeStatement(b, p).netProfit).toBeGreaterThan(0);
  });
  it("infers SAR from a Saudi VAT number when no symbol is read", () => {
    expect(parseInvoiceText("Supplier X\nVAT No 300987654321003\nTotal 115.00", 15).currency).toBe("SAR");
  });
});

describe("OpenOCR output", async () => {
  const { linesToText, meanScore } = await import("./openocr");
  // Real response from openocr-server for the English test invoice (OpenOCR drops some spaces).
  const lines = [
    { text: "Gulf Office Supplies LLC", score: 0.9775, box: [45, 49, 401, 83] },
    { text: "TAXINVOICE", score: 0.9977, box: [46, 109, 172, 128] },
    { text: "TRN:100456789012345", score: 0.9967, box: [46, 133, 265, 152] },
    { text: "InvoiceNo:GOS-7781", score: 0.9973, box: [46, 155, 249, 174] },
    { text: "Date:03/02/2026", score: 0.9954, box: [46, 176, 201, 198] },
    { text: "A4Paperx20", score: 0.9884, box: [55, 254, 187, 277] },
    { text: "400.00", score: 1, box: [207, 256, 273, 275] },
    { text: "SubtotalAED1,200.00", score: 0.9964, box: [47, 346, 249, 366] },
    { text: "VAT5%AED60.00", score: 0.9995, box: [47, 369, 218, 388] },
    { text: "TotalAmountDueAED1,260.00", score: 0.9914, box: [47, 391, 346, 410] },
  ] as { text: string; score: number; box: [number, number, number, number] }[];
  it("rebuilds lines and parses the invoice", () => {
    const text = linesToText(lines);
    expect(text.split("\n")[5]).toBe("A4Paperx20 400.00");
    expect(meanScore(lines)).toBeGreaterThan(0.98);
    const r = parseInvoiceText(text, 5);
    expect([r.supplier, r.supplierTrn, r.number, r.date, r.subtotal, r.vat, r.total, r.currency])
      .toEqual(["Gulf Office Supplies LLC", "100456789012345", "GOS-7781", "2026-02-03", 1200, 60, 1260, "AED"]);
  });
});
