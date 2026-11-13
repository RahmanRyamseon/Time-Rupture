// VAT treatment, invoice verification and return-box mapping for GCC VAT.
// Adapted from the repo's vat-compliance rule engine (Bahrain Decree-Law 48/2018)
// and generalised to the GCC VAT Framework as applied in UAE, KSA, Bahrain and Oman.
// Keyword lists and box layouts are practical starting points, not the authorities'
// official lists or forms – review before filing.
import type { CountryCode, Mils } from "./types";
import { COUNTRIES } from "./countries";

export type VatTreatment =
  | "standard"        // standard-rated, VAT recoverable (purchases) / charged (sales)
  | "zero"            // zero-rated domestic supply
  | "export"          // zero-rated export (sales)
  | "exempt"          // exempt supply – no VAT, no recovery
  | "out_of_scope"    // outside the scope of VAT (e.g. salaries, government fees, fines)
  | "reverse_charge"  // imported services/goods: self-account output and input VAT
  | "blocked";        // VAT paid but not recoverable (entertainment, no valid tax invoice, foreign VAT…)

export const TREATMENTS: Record<VatTreatment, [string, string, ("purchase" | "sales")[]]> = {
  standard: ["Standard-rated", "خاضع للنسبة الأساسية", ["purchase", "sales"]],
  zero: ["Zero-rated", "خاضع لنسبة الصفر", ["purchase", "sales"]],
  export: ["Export (zero-rated)", "تصدير (نسبة الصفر)", ["sales"]],
  exempt: ["Exempt", "معفى", ["purchase", "sales"]],
  out_of_scope: ["Out of scope", "خارج نطاق الضريبة", ["purchase", "sales"]],
  reverse_charge: ["Import – reverse charge", "استيراد – احتساب عكسي", ["purchase"]],
  blocked: ["VAT not recoverable (blocked)", "ضريبة غير قابلة للاسترداد", ["purchase"]],
};

const BLOCKED_KEYWORDS = [
  "entertainment", "restaurant", "catering", "hospitality", "gift", "personal use", "club membership",
  "golf", "yacht", "recreational", "meal", "dinner", "lunch", "ضيافة", "مطعم", "هدية", "ترفيه", "وجبة",
];
const ZERO_RATED_KEYWORDS = [
  "infant formula", "medicine", "pharma", "medical equipment", "crude oil", "natural gas", "international transport",
  "air ticket", "flight", "airline", "education", "school fees", "tuition", "precious metal", "gold bullion",
  "أدوية", "دواء", "تذكرة طيران", "رسوم مدرسية", "تعليم",
];
const BH_OM_FOOD_ZERO = ["rice", "bread", "milk", "vegetable", "fruit", "meat", "fish", "eggs", "flour", "أرز", "خبز", "حليب", "خضار", "فواكه", "لحم", "سمك", "بيض", "دقيق"];
const EXEMPT_KEYWORDS = [
  "residential rent", "residential lease", "apartment rent", "villa rent", "local passenger transport", "bare land",
  "life insurance", "interest", "loan", "financial service margin", "إيجار سكني", "تأمين على الحياة", "فائدة",
];
const OUT_OF_SCOPE_KEYWORDS = [
  "salary", "salaries", "wages", "payroll", "visa fee", "government fee", "fine", "penalty", "municipality",
  "trade licence", "trade license", "gosi", "dividend", "رواتب", "غرامة", "رسوم حكومية", "رخصة تجارية", "بلدية",
];

const has = (text: string, list: string[]) => {
  const t = ` ${text.toLowerCase()} `;
  return list.find((k) => t.includes(k)) ?? null;
};

/** Infers the issuing country from a 15-digit VAT number's format. */
export function trnCountry(trn: string | undefined): CountryCode | null {
  const d = (trn ?? "").replace(/\D/g, "");
  if (d.length !== 15) return null;
  if (/^3\d{13}3$/.test(d)) return "SA";
  if (d.startsWith("100")) return "AE";
  return null;
}

/** Accounts whose costs are normally outside the scope of VAT or blocked. */
const ACCOUNT_TREATMENT: Record<string, VatTreatment> = {
  "6000": "out_of_scope", "6010": "out_of_scope", "6020": "out_of_scope", "6900": "out_of_scope",
  "7000": "exempt", "8000": "out_of_scope", "6850": "blocked",
};

export interface TreatmentInput {
  kind: "purchase" | "sales";
  text: string;           // vendor + description + OCR text
  account: string;
  partyTrn: string;
  vat: Mils;              // VAT printed on the invoice
  country: CountryCode;   // the company's country
  currency: string;
  baseCurrency: string;
}

export interface Suggestion { treatment: VatTreatment; reason: [string, string] }

export function suggestTreatment(i: TreatmentInput): Suggestion {
  const preset = COUNTRIES[i.country];
  if (preset.vatRate === 0) return { treatment: "out_of_scope", reason: ["VAT is not implemented in this country", "ضريبة القيمة المضافة غير مطبقة في هذه الدولة"] };
  const partyCountry = trnCountry(i.partyTrn);
  const foreign = (partyCountry && partyCountry !== i.country) || (!i.partyTrn && i.currency !== i.baseCurrency && !["AED", "SAR", "QAR", "KWD", "BHD", "OMR"].includes(i.currency) );
  if (i.kind === "purchase") {
    if (partyCountry && partyCountry !== i.country && i.vat > 0) {
      return { treatment: "blocked", reason: [`Foreign VAT charged by a ${COUNTRIES[partyCountry].name} supplier can't be recovered on your ${preset.name} return`, `ضريبة أجنبية من مورد في ${COUNTRIES[partyCountry].nameAr} لا تُسترد في إقرار ${preset.nameAr}`] };
    }
    if (foreign && i.vat === 0) return { treatment: "reverse_charge", reason: ["Foreign supplier, no VAT charged – self-account under reverse charge", "مورد أجنبي بدون ضريبة – يُطبق الاحتساب العكسي"] };
    const blockedWord = has(i.text, BLOCKED_KEYWORDS);
    if (blockedWord || ACCOUNT_TREATMENT[i.account] === "blocked") {
      return { treatment: "blocked", reason: [`Entertainment / hospitality ("${blockedWord ?? "meals"}") – input VAT is blocked`, `ضيافة وترفيه ("${blockedWord ?? "وجبات"}") – ضريبة المدخلات محظورة`] };
    }
  }
  const acct = ACCOUNT_TREATMENT[i.account];
  if (acct === "out_of_scope" || has(i.text, OUT_OF_SCOPE_KEYWORDS)) {
    if (i.vat === 0) return { treatment: "out_of_scope", reason: ["Salaries, government fees and similar are outside the scope of VAT", "الرواتب والرسوم الحكومية ونحوها خارج نطاق الضريبة"] };
  }
  const exemptWord = has(i.text, EXEMPT_KEYWORDS);
  if ((exemptWord || acct === "exempt") && i.vat === 0) return { treatment: "exempt", reason: [`Exempt supply ("${exemptWord ?? "finance"}")`, `توريد معفى ("${exemptWord ?? "تمويل"}")`] };
  const zeroWord = has(i.text, ZERO_RATED_KEYWORDS) ?? ((i.country === "BH" || i.country === "OM") ? has(i.text, BH_OM_FOOD_ZERO) : null);
  if (zeroWord && i.vat === 0) return { treatment: "zero", reason: [`Zero-rated item ("${zeroWord}")`, `صنف خاضع لنسبة الصفر ("${zeroWord}")`] };
  if (i.kind === "sales" && foreign && i.vat === 0) return { treatment: "export", reason: ["Customer outside the country, no VAT – export", "عميل خارج الدولة بدون ضريبة – تصدير"] };
  if (i.kind === "purchase" && i.vat > 0 && !i.partyTrn) {
    return { treatment: "blocked", reason: ["No supplier VAT number on the invoice – input VAT is not recoverable without a valid tax invoice", "لا يوجد رقم ضريبي للمورد – لا تُسترد الضريبة بدون فاتورة ضريبية صحيحة"] };
  }
  if (i.vat === 0) return { treatment: i.kind === "sales" ? "zero" : "out_of_scope", reason: ["No VAT shown on the invoice", "لا توجد ضريبة على الفاتورة"] };
  return { treatment: "standard", reason: ["Standard-rated supply with VAT shown", "توريد خاضع للنسبة الأساسية مع ضريبة ظاهرة"] };
}

export interface Finding { level: "error" | "warn"; en: string; ar: string }

export interface VerifyInput {
  kind: "purchase" | "sales";
  number: string;
  date: string;
  party: string;
  partyTrn: string;
  net: Mils;
  vat: Mils;
  rate: number;
  treatment: VatTreatment;
  country: CountryCode;
  currency: string;
  baseCurrency: string;
  period?: { from: string; to: string };
}

const TOL = 10; // 0.01 in mils

/** Tax-invoice and VAT checks, adapted from vat-compliance's verifyLine. */
export function verifyInvoice(v: VerifyInput): Finding[] {
  const f: Finding[] = [];
  const preset = COUNTRIES[v.country];
  const vatApplies = preset.vatRate > 0;
  if (!v.number.trim()) f.push({ level: "warn", en: "Missing invoice number", ar: "رقم الفاتورة مفقود" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) f.push({ level: "error", en: "Missing or invalid invoice (tax point) date", ar: "تاريخ الفاتورة (تاريخ الاستحقاق الضريبي) مفقود أو غير صحيح" });
  if (!v.party.trim()) f.push({ level: "warn", en: v.kind === "purchase" ? "Missing supplier name" : "Missing customer name", ar: v.kind === "purchase" ? "اسم المورد مفقود" : "اسم العميل مفقود" });
  const trnDigits = v.partyTrn.replace(/\D/g, "");
  if (vatApplies && v.kind === "purchase" && v.treatment === "standard" && !trnDigits) {
    f.push({ level: "error", en: "No supplier TRN – input VAT can't be recovered without a valid tax invoice", ar: "لا يوجد رقم ضريبي للمورد – لا يمكن استرداد الضريبة بدون فاتورة ضريبية صحيحة" });
  } else if (trnDigits && !/^\d{10,15}$/.test(trnDigits)) {
    f.push({ level: "warn", en: `TRN "${v.partyTrn}" is not a valid 10–15 digit number`, ar: `الرقم الضريبي "${v.partyTrn}" غير صحيح (١٠–١٥ رقماً)` });
  } else if (trnDigits && trnDigits.length !== 15 && (v.country === "AE" || v.country === "SA")) {
    f.push({ level: "warn", en: "UAE/KSA VAT numbers have 15 digits", ar: "الرقم الضريبي في الإمارات والسعودية مكون من ١٥ رقماً" });
  }
  const zeroVat = ["zero", "export", "exempt", "out_of_scope", "reverse_charge"].includes(v.treatment);
  if (zeroVat && v.vat > TOL) {
    f.push({ level: "error", en: `"${TREATMENTS[v.treatment][0]}" invoices should not carry VAT – check the treatment`, ar: `فواتير "${TREATMENTS[v.treatment][1]}" لا يجب أن تتضمن ضريبة – راجع المعالجة` });
  }
  if ((v.treatment === "standard" || v.treatment === "blocked") && v.net > 0) {
    const expected = Math.round((v.net * v.rate) / 100);
    if (Math.abs(v.vat - expected) > Math.max(TOL, v.net * 0.0005)) {
      f.push({ level: "warn", en: `VAT ${(v.vat / 1000).toFixed(2)} doesn't equal ${v.rate}% of the net amount (${(expected / 1000).toFixed(2)})`, ar: `الضريبة ${(v.vat / 1000).toFixed(2)} لا تساوي ${v.rate}٪ من المبلغ الصافي (${(expected / 1000).toFixed(2)})` });
    }
    if (vatApplies && v.treatment === "standard" && Math.abs(v.rate - preset.vatRate) > 0.01) {
      f.push({ level: "warn", en: `Rate ${v.rate}% differs from the ${preset.name} standard rate of ${preset.vatRate}%`, ar: `النسبة ${v.rate}٪ تختلف عن النسبة الأساسية ${preset.vatRate}٪` });
    }
  }
  if (v.kind === "sales" && v.treatment === "standard" && vatApplies && v.vat === 0 && v.net > 0) {
    f.push({ level: "warn", en: "Standard-rated sale with no VAT charged", ar: "مبيعات خاضعة للنسبة الأساسية بدون ضريبة" });
  }
  if (v.period && /^\d{4}-\d{2}-\d{2}$/.test(v.date) && (v.date < v.period.from || v.date > v.period.to)) {
    f.push({ level: "warn", en: `Tax point ${v.date} is outside the selected period – it will fall in another VAT return`, ar: `تاريخ الاستحقاق ${v.date} خارج الفترة المحددة – سيظهر في إقرار آخر` });
  }
  if (v.currency !== v.baseCurrency) {
    f.push({ level: "warn", en: `Invoice in ${v.currency} – VAT must be reported in ${v.baseCurrency} at the official rate on the tax point date`, ar: `الفاتورة بعملة ${v.currency} – يجب الإقرار بالضريبة بعملة ${v.baseCurrency} بسعر الصرف الرسمي في تاريخ الاستحقاق` });
  }
  return f;
}

// ---------- VAT return boxes ----------

export interface VatTotals {
  salesStandard: { net: Mils; vat: Mils };
  salesZero: Mils; salesExport: Mils; salesExempt: Mils; salesOutOfScope: Mils;
  purchStandard: { net: Mils; vat: Mils };
  reverseCharge: { net: Mils; vat: Mils };
  purchZero: Mils; purchExempt: Mils; purchOutOfScope: Mils;
  blocked: { net: Mils; vat: Mils };
  outputVat: Mils; inputVat: Mils; netPayable: Mils;
}

export interface BoxRow { box: string; label: string; labelAr: string; amount: Mils | null; vat: Mils | null; bold?: boolean }

const B = (box: string, label: string, labelAr: string, amount: Mils | null, vat: Mils | null, bold = false): BoxRow => ({ box, label, labelAr, amount, vat, bold });

/** Maps totals onto the shape of each country's VAT return (illustrative – confirm against the live form). */
export function returnBoxes(country: CountryCode, t: VatTotals): BoxRow[] {
  const allPurch = t.purchStandard.net + t.reverseCharge.net + t.purchZero + t.purchExempt;
  const allSales = t.salesStandard.net + t.salesZero + t.salesExport + t.salesExempt;
  switch (country) {
    case "AE": // FTA VAT201
      return [
        B("1", "Standard rated supplies", "التوريدات الخاضعة للنسبة الأساسية", t.salesStandard.net, t.salesStandard.vat),
        B("3", "Supplies subject to the reverse charge", "التوريدات الخاضعة لآلية الاحتساب العكسي", t.reverseCharge.net, t.reverseCharge.vat),
        B("4", "Zero rated supplies (incl. exports)", "التوريدات الخاضعة لنسبة الصفر (بما فيها الصادرات)", t.salesZero + t.salesExport, null),
        B("5", "Exempt supplies", "التوريدات المعفاة", t.salesExempt, null),
        B("8", "Totals (output)", "المجموع (المخرجات)", t.salesStandard.net + t.reverseCharge.net + t.salesZero + t.salesExport + t.salesExempt, t.outputVat, true),
        B("9", "Standard rated expenses (recoverable)", "النفقات الخاضعة للنسبة الأساسية (القابلة للاسترداد)", t.purchStandard.net, t.purchStandard.vat),
        B("10", "Supplies subject to the reverse charge (recoverable)", "التوريدات الخاضعة للاحتساب العكسي (القابلة للاسترداد)", t.reverseCharge.net, t.reverseCharge.vat),
        B("11", "Totals (input)", "المجموع (المدخلات)", t.purchStandard.net + t.reverseCharge.net, t.inputVat, true),
        B("12", "Total value of due tax", "إجمالي الضريبة المستحقة", null, t.outputVat),
        B("13", "Total value of recoverable tax", "إجمالي الضريبة القابلة للاسترداد", null, t.inputVat),
        B("14", "Payable tax for the period", "الضريبة المستحقة الدفع عن الفترة", null, t.netPayable, true),
      ];
    case "SA": // ZATCA VAT return
      return [
        B("1", "Standard rated sales", "المبيعات الخاضعة للنسبة الأساسية", t.salesStandard.net, t.salesStandard.vat),
        B("3", "Zero rated domestic sales", "المبيعات المحلية الخاضعة لنسبة الصفر", t.salesZero, null),
        B("4", "Exports", "الصادرات", t.salesExport, null),
        B("5", "Exempt sales", "المبيعات المعفاة", t.salesExempt, null),
        B("6", "Total sales", "إجمالي المبيعات", allSales, t.salesStandard.vat, true),
        B("7", "Standard rated domestic purchases", "المشتريات المحلية الخاضعة للنسبة الأساسية", t.purchStandard.net, t.purchStandard.vat),
        B("9", "Imports subject to VAT accounted through reverse charge", "الاستيرادات الخاضعة للاحتساب العكسي", t.reverseCharge.net, t.reverseCharge.vat),
        B("10", "Zero rated purchases", "المشتريات الخاضعة لنسبة الصفر", t.purchZero, null),
        B("11", "Exempt purchases", "المشتريات المعفاة", t.purchExempt, null),
        B("12", "Total purchases", "إجمالي المشتريات", allPurch, t.inputVat, true),
        B("13", "Total VAT due for current period", "إجمالي ضريبة القيمة المضافة المستحقة عن الفترة", null, t.netPayable, true),
      ];
    case "BH": // NBR return (shape follows vat-compliance's mapping)
      return [
        B("1", "Standard-rated sales", "المبيعات الخاضعة للنسبة الأساسية", t.salesStandard.net, t.salesStandard.vat),
        B("2", "Zero-rated domestic sales", "المبيعات المحلية بنسبة الصفر", t.salesZero, null),
        B("3", "Exports", "الصادرات", t.salesExport, null),
        B("4", "Exempt supplies", "التوريدات المعفاة", t.salesExempt, null),
        B("6", "Total output VAT", "إجمالي ضريبة المخرجات", t.salesStandard.net + t.reverseCharge.net, t.outputVat, true),
        B("10a", "Imports (reverse charge)", "الاستيرادات (احتساب عكسي)", t.reverseCharge.net, t.reverseCharge.vat),
        B("10b", "Standard-rated purchases", "المشتريات الخاضعة للنسبة الأساسية", t.purchStandard.net, t.purchStandard.vat),
        B("11", "Zero-rated purchases", "المشتريات بنسبة الصفر", t.purchZero, null),
        B("12", "Exempt purchases", "المشتريات المعفاة", t.purchExempt, null),
        B("13", "Blocked input VAT (non-recoverable)", "ضريبة مدخلات محظورة (غير قابلة للاسترداد)", t.blocked.net, t.blocked.vat),
        B("14", "Net recoverable input VAT", "صافي ضريبة المدخلات القابلة للاسترداد", null, t.inputVat, true),
        B("17", "Net VAT due / (recoverable)", "صافي الضريبة المستحقة / (المستردة)", null, t.netPayable, true),
      ];
    default: // Oman and a generic layout
      return [
        B("1", "Standard-rated supplies", "التوريدات الخاضعة للنسبة الأساسية", t.salesStandard.net, t.salesStandard.vat),
        B("2", "Zero-rated supplies and exports", "التوريدات بنسبة الصفر والصادرات", t.salesZero + t.salesExport, null),
        B("3", "Exempt supplies", "التوريدات المعفاة", t.salesExempt, null),
        B("4", "Reverse charge (imports)", "الاحتساب العكسي (الاستيرادات)", t.reverseCharge.net, t.reverseCharge.vat),
        B("5", "Total output VAT", "إجمالي ضريبة المخرجات", null, t.outputVat, true),
        B("6", "Recoverable input VAT – domestic purchases", "ضريبة المدخلات القابلة للاسترداد – المشتريات المحلية", t.purchStandard.net, t.purchStandard.vat),
        B("7", "Recoverable input VAT – reverse charge", "ضريبة المدخلات القابلة للاسترداد – الاحتساب العكسي", t.reverseCharge.net, t.reverseCharge.vat),
        B("8", "Total recoverable input VAT", "إجمالي ضريبة المدخلات القابلة للاسترداد", null, t.inputVat, true),
        B("9", "Net VAT payable / (refundable)", "صافي الضريبة المستحقة / (المستردة)", null, t.netPayable, true),
      ];
  }
}
