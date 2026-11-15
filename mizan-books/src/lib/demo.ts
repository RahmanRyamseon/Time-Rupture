import { emptyBooks, newCompany } from "./store";
import { bankLineToEntry, invoiceToEntry } from "./ledger";
import { toMils, uid } from "./money";
import { SYS } from "./coa";
import type { Books, JournalEntry } from "./types";

/** Sample books for a small Manama trading company (BHD, 10% VAT), for the "Load sample data" button. */
export function demoBooks(year = new Date().getFullYear()): Books {
  const c = {
    ...newCompany("BH", "Al Seef Trading W.L.L."),
    nameAr: "السيف للتجارة ذ.م.م", trn: "220012345600002", address: "Building 123, Road 456, Block 428, Manama, Kingdom of Bahrain",
  };
  const b = emptyBooks(c);
  const now = new Date().toISOString();
  const d = (m: number, day: number) => `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const es: JournalEntry[] = [];
  const je = (date: string, memo: string, lines: [string, number, number][], source: JournalEntry["source"] = "manual") =>
    es.push({ id: uid(), date, memo, source, createdAt: now, lines: lines.map(([account, dr, cr]) => ({ account, debit: toMils(dr), credit: toMils(cr) })) });

  je(d(1, 1), "Opening balances / أرصدة افتتاحية", [[SYS.bank, 8500, 0], ["1200", 4000, 0], ["1500", 3000, 0], ["1550", 0, 600], ["3000", 0, 10000], [SYS.retained, 0, 4900]], "opening");
  type T = "standard" | "zero" | "blocked" | "out_of_scope";
  const inv = (m: number, day: number, kind: "sales" | "purchase", party: string, net: number, account: string, settlement: "credit" | "bank" | "cash", no: string, treatment: T = "standard") =>
    es.push(invoiceToEntry({ kind, date: d(m, day), number: no, party, partyTrn: "", net: toMils(net), vat: treatment === "standard" || treatment === "blocked" ? toMils(net * 0.1) : 0, vatRate: 10, account, settlement, treatment }, uid(), now));
  for (let m = 1; m <= 6; m++) {
    inv(m, 5, "sales", "Gulf Hardware Co. W.L.L.", 6400 + m * 250, "4000", "credit", `S-${year}-${m}01`);
    inv(m, 18, "sales", "Walk-in customers", 1400 + m * 50, "4000", "cash", `S-${year}-${m}02`);
    inv(m, 7, "purchase", "Bahrain Steel Supplies", 2600 + m * 90, "5000", "credit", `P-${m}07`);
    inv(m, 1, "purchase", "Seef Properties", 800, "6100", "bank", `R-${m}`);
    const bank = (day: number, desc: string, amt: number, account: string, withVat = false, party?: string) =>
      es.push(bankLineToEntry({ id: uid(), date: d(m, day), description: desc, amount: toMils(amt), account, withVat, include: true, party }, SYS.bank, 10, uid(), now));
    bank(25, "WPS SALARY TRANSFER", -1850, "6000");
    bank(26, "SIO CONTRIBUTIONS", -210, "6010");
    bank(12, "EWA BILL PAYMENT", -132, "6200", true);
    bank(14, "BATELCO POSTPAID", -77, "6210", true);
    bank(20, "TRANSFER FROM GULF HARDWARE CO", 6800 + m * 275, SYS.ar, false, "Gulf Hardware Co. W.L.L.");
    bank(22, "PAYMENT TO BAHRAIN STEEL SUPPLIES", -(2700 + m * 90), SYS.ap, false, "Bahrain Steel Supplies");
    bank(28, "BANK SERVICE CHARGES", -5.5, "6950", true);
    je(d(m, 28), "Monthly depreciation / إهلاك شهري", [["6900", 50, 0], ["1550", 0, 50]]);
    je(d(m, 28), "Leaving indemnity provision / مخصص مكافأة نهاية الخدمة", [["6010", 120, 0], ["2500", 0, 120]]);
  }
  inv(2, 10, "purchase", "Lulu Hypermarket – dates & coffee for office", 45, "6850", "cash", "L-210", "zero");
  inv(3, 15, "purchase", "Business dinner with client", 60, "6850", "cash", "D-315", "blocked");
  es.push(bankLineToEntry({ id: uid(), date: d(3, 9), description: "LMRA WORK PERMIT FEES", amount: toMils(-344), account: "6020", withVat: false, include: true }, SYS.bank, 10, uid(), now));
  es.push(bankLineToEntry({ id: uid(), date: d(4, 9), description: "POS BAPCO STATION 112", amount: toMils(-42), account: SYS.suspense, withVat: false, include: true }, SYS.bank, 10, uid(), now));
  b.entries = es;
  return b;
}
