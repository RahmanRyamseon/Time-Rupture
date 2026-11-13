import type { Books, Lang } from "./types";
import { balanceSheet, cashFlow, generalLedger, incomeStatement, trialBalance, vatSummary, type Line, type Period } from "./ledger";
import { t } from "./i18n";
import { download } from "./files";
import { returnBoxes, TREATMENTS } from "./vat";
import { accountName } from "./store";

/** Builds an Excel workbook with TB, P&L, balance sheet, cash flow, VAT and journal (bilingual labels). */
export async function exportWorkbook(books: Books, p: Period, lang: Lang, decimals: number) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mizan Books";
  const fmt = decimals === 3 ? "#,##0.000;(#,##0.000);-" : "#,##0.00;(#,##0.00);-";
  const v = (m: number) => m / 1000;
  const co = books.company;
  const title = (ws: import("exceljs").Worksheet, name: string, sub: string) => {
    ws.views = [{ rightToLeft: lang === "ar" }];
    ws.addRow([lang === "ar" && co.nameAr ? co.nameAr : co.name]).font = { bold: true, size: 14 };
    ws.addRow([name]).font = { bold: true, size: 12 };
    ws.addRow([sub]);
    ws.addRow([`${t(lang, "currency")}: ${co.currency}${co.trn ? `   ${t(lang, "trn")}: ${co.trn}` : ""}`]);
    ws.addRow([]);
  };
  const statement = (name: string, sub: string, lines: Line[]) => {
    const ws = wb.addWorksheet(name.slice(0, 31));
    title(ws, name, sub);
    ws.columns = [{ width: 12 }, { width: 50 }, { width: 50 }, { width: 18 }];
    ws.addRow([t(lang, "code"), "English", "العربية", co.currency]).font = { bold: true };
    for (const l of lines) {
      const row = ws.addRow([l.code ?? "", `${"   ".repeat(l.indent ?? 0)}${l.label}`, l.labelAr, l.kind === "header" ? null : v(l.amount)]);
      row.getCell(4).numFmt = fmt;
      if (l.kind && l.kind !== "header") row.font = { bold: true };
      if (l.kind === "header") row.font = { bold: true, italic: true };
      if (l.kind === "total") row.getCell(4).border = { top: { style: "thin" }, bottom: { style: "double" } };
    }
  };
  const periodLabel = `${p.from} → ${p.to}`;

  // Trial balance
  const tb = trialBalance(books, p);
  const ws = wb.addWorksheet(t(lang, "trialBalance").slice(0, 31));
  title(ws, t(lang, "trialBalance"), `${t(lang, "asAt")} ${p.to}`);
  ws.columns = [{ width: 10 }, { width: 40 }, { width: 40 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
  ws.addRow([t(lang, "code"), "Account", "الحساب", t(lang, "opening"), t(lang, "debit"), t(lang, "credit"), `${t(lang, "closing")} ${t(lang, "debit")}`, `${t(lang, "closing")} ${t(lang, "credit")}`]).font = { bold: true };
  for (const r of tb.rows) {
    const row = ws.addRow([r.account.code, r.account.name, r.account.nameAr, v(r.opening), v(r.debit), v(r.credit), r.closing > 0 ? v(r.closing) : null, r.closing < 0 ? v(-r.closing) : null]);
    for (let c = 4; c <= 8; c++) row.getCell(c).numFmt = fmt;
  }
  const tot = ws.addRow(["", t(lang, "totals"), "", v(tb.totals.opening), v(tb.totals.debit), v(tb.totals.credit), v(tb.totals.closingDr), v(tb.totals.closingCr)]);
  tot.font = { bold: true };
  for (let c = 4; c <= 8; c++) tot.getCell(c).numFmt = fmt;

  statement(t(lang, "incomeStatement"), `${t(lang, "forPeriod")} ${periodLabel}`, incomeStatement(books, p).lines);
  statement(t(lang, "balanceSheet"), `${t(lang, "asAt")} ${p.to}`, balanceSheet(books, p).lines);
  statement(t(lang, "cashFlow"), `${t(lang, "forPeriod")} ${periodLabel}`, cashFlow(books, p).lines);

  // VAT
  const vs = vatSummary(books, p);
  const wv = wb.addWorksheet(t(lang, "vat").slice(0, 31));
  title(wv, t(lang, "vat"), periodLabel);
  wv.columns = [{ width: 8 }, { width: 55 }, { width: 18 }, { width: 18 }];
  wv.addRow([t(lang, "box"), t(lang, "description"), t(lang, "amount"), t(lang, "vatAmount")]).font = { bold: true };
  for (const r of returnBoxes(co.country, vs)) {
    const row = wv.addRow([r.box, lang === "ar" ? r.labelAr : r.label, r.amount != null ? v(r.amount) : null, r.vat != null ? v(r.vat) : null]);
    row.getCell(3).numFmt = fmt; row.getCell(4).numFmt = fmt;
    if (r.bold) row.font = { bold: true };
  }
  if (vs.blocked.vat) wv.addRow(["", t(lang, "blockedVat"), v(vs.blocked.net), v(vs.blocked.vat)]);
  wv.addRow([]);
  wv.addRow([t(lang, "date"), t(lang, "reference"), t(lang, "party"), t(lang, "trn"), t(lang, "type"), t(lang, "vatTreatment"), t(lang, "netAmount"), t(lang, "vatAmount")]).font = { bold: true };
  for (const e of vs.entries) {
    const r = wv.addRow([e.date, e.ref ?? "", e.party ?? e.memo, e.tax?.partyTrn ?? "", e.tax?.kind, TREATMENTS[e.tax?.treatment ?? "standard"][lang === "ar" ? 1 : 0], v(e.tax!.net), v(e.tax!.vat)]);
    r.getCell(7).numFmt = fmt; r.getCell(8).numFmt = fmt;
  }

  // Journal
  const wj = wb.addWorksheet(t(lang, "journal").slice(0, 31));
  title(wj, t(lang, "journal"), periodLabel);
  wj.columns = [{ width: 12 }, { width: 14 }, { width: 40 }, { width: 10 }, { width: 36 }, { width: 16 }, { width: 16 }, { width: 10 }];
  wj.addRow([t(lang, "date"), t(lang, "reference"), t(lang, "description"), t(lang, "code"), t(lang, "account"), t(lang, "debit"), t(lang, "credit"), t(lang, "source")]).font = { bold: true };
  const inP = books.entries.filter((e) => e.date >= p.from && e.date <= p.to).sort((a, b) => a.date.localeCompare(b.date));
  for (const e of inP) {
    for (const l of e.lines) {
      const r = wj.addRow([e.date, e.ref ?? "", e.memo, l.account, accountName(books, l.account, lang), l.debit ? v(l.debit) : null, l.credit ? v(l.credit) : null, e.source]);
      r.getCell(6).numFmt = fmt; r.getCell(7).numFmt = fmt;
    }
  }

  // General ledger (one sheet, grouped by account)
  const wg = wb.addWorksheet(t(lang, "ledger").slice(0, 31));
  title(wg, t(lang, "ledger"), periodLabel);
  wg.columns = [{ width: 12 }, { width: 14 }, { width: 44 }, { width: 16 }, { width: 16 }, { width: 18 }];
  for (const r of tb.rows) {
    const gl = generalLedger(books, r.account.code, p);
    wg.addRow([`${r.account.code} – ${lang === "ar" ? r.account.nameAr : r.account.name}`]).font = { bold: true };
    const o = wg.addRow(["", "", t(lang, "opening"), null, null, v(gl.opening)]); o.getCell(6).numFmt = fmt;
    for (const g of gl.rows) {
      const x = wg.addRow([g.entry.date, g.entry.ref ?? "", g.entry.memo, g.line.debit ? v(g.line.debit) : null, g.line.credit ? v(g.line.credit) : null, v(g.running)]);
      for (let c = 4; c <= 6; c++) x.getCell(c).numFmt = fmt;
    }
    wg.addRow([]);
  }

  const buf = await wb.xlsx.writeBuffer();
  const safe = co.name.replace(/[^\w؀-ۿ-]+/g, "_");
  download(`${safe}_financials_${p.from}_${p.to}.xlsx`, buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
