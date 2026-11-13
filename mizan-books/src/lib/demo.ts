import { emptyBooks, newCompany } from "./store";
import { bankLineToEntry, invoiceToEntry } from "./ledger";
import { toMils, uid } from "./money";
import { SYS } from "./coa";
import type { Books, JournalEntry } from "./types";

/** Sample books for a small Dubai trading company, used for the "Load sample data" button. */
export function demoBooks(year = new Date().getFullYear()): Books {
  const c = { ...newCompany("AE", "Al Waha Trading LLC"), nameAr: "الواحة للتجارة ذ.م.م", trn: "100345678900003", address: "Al Quoz, Dubai, UAE" };
  const b = emptyBooks(c);
  const now = new Date().toISOString();
  const d = (m: number, day: number) => `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const es: JournalEntry[] = [];
  const je = (date: string, memo: string, lines: [string, number, number][], source: JournalEntry["source"] = "manual") =>
    es.push({ id: uid(), date, memo, source, createdAt: now, lines: lines.map(([account, dr, cr]) => ({ account, debit: toMils(dr), credit: toMils(cr) })) });

  je(d(1, 1), "Opening balances / أرصدة افتتاحية", [[SYS.bank, 85000, 0], ["1200", 40000, 0], ["1500", 30000, 0], ["1550", 0, 6000], ["3000", 0, 100000], [SYS.retained, 0, 49000]], "opening");
  const inv = (m: number, day: number, kind: "sales" | "purchase", party: string, net: number, account: string, settlement: "credit" | "bank" | "cash", no: string) =>
    es.push(invoiceToEntry({ kind, date: d(m, day), number: no, party, partyTrn: "", net: toMils(net), vat: toMils(net * 0.05), vatRate: 5, account, settlement }, uid(), now));
  for (let m = 1; m <= 6; m++) {
    inv(m, 5, "sales", "Gulf Hardware Co.", 64000 + m * 2500, "4000", "credit", `S-${year}-${m}01`);
    inv(m, 18, "sales", "Walk-in customers", 14000 + m * 500, "4000", "cash", `S-${year}-${m}02`);
    inv(m, 7, "purchase", "Emirates Steel Supplies", 26000 + m * 900, "5000", "credit", `P-${m}07`);
    inv(m, 1, "purchase", "Al Quoz Properties", 8000, "6100", "bank", `R-${m}`);
    const bank = (day: number, desc: string, amt: number, account: string, withVat = false) =>
      es.push(bankLineToEntry({ id: uid(), date: d(m, day), description: desc, amount: toMils(amt), account, withVat, include: true }, SYS.bank, 5, uid(), now));
    bank(25, "WPS SALARY TRANSFER", -18500, "6000");
    bank(12, "DEWA BILL PAYMENT", -1365, "6200", true);
    bank(14, "ETISALAT POSTPAID", -735, "6210", true);
    bank(20, "TRANSFER FROM GULF HARDWARE CO", 62000 + m * 2500, SYS.ar);
    bank(22, "PAYMENT TO EMIRATES STEEL", -(25000 + m * 800), SYS.ap);
    bank(28, "BANK SERVICE CHARGES", -52.5, "6950", true);
    je(d(m, 28), "Monthly depreciation / إهلاك شهري", [["6900", 500, 0], ["1550", 0, 500]]);
    je(d(m, 28), "End-of-service provision / مخصص نهاية الخدمة", [["6010", 1200, 0], ["2500", 0, 1200]]);
  }
  es.push(bankLineToEntry({ id: uid(), date: d(3, 9), description: "POS ADNOC 2231 DUBAI", amount: toMils(-420), account: SYS.suspense, withVat: false, include: true }, SYS.bank, 5, uid(), now));
  b.entries = es;
  return b;
}
