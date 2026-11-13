import type { CountryCode } from "./types";

export interface CountryPreset {
  code: CountryCode;
  name: string;
  nameAr: string;
  currency: string;
  currencyAr: string;
  decimals: 2 | 3;
  /** Standard VAT rate in percent; 0 where VAT is not implemented. */
  vatRate: number;
  vatAuthority: string;
  vatAuthorityAr: string;
  trnLabel: string;
  trnLabelAr: string;
  /** Units of this currency per 1 USD (pegged rates; KWD is basket-linked and indicative). */
  perUsd: number;
}

export const COUNTRIES: Record<CountryCode, CountryPreset> = {
  AE: {
    code: "AE", name: "United Arab Emirates", nameAr: "الإمارات العربية المتحدة",
    currency: "AED", currencyAr: "د.إ", decimals: 2, vatRate: 5,
    vatAuthority: "Federal Tax Authority (FTA)", vatAuthorityAr: "الهيئة الاتحادية للضرائب",
    trnLabel: "TRN", trnLabelAr: "رقم التسجيل الضريبي", perUsd: 3.6725,
  },
  SA: {
    code: "SA", name: "Saudi Arabia", nameAr: "المملكة العربية السعودية",
    currency: "SAR", currencyAr: "ر.س", decimals: 2, vatRate: 15,
    vatAuthority: "ZATCA", vatAuthorityAr: "هيئة الزكاة والضريبة والجمارك",
    trnLabel: "VAT No.", trnLabelAr: "الرقم الضريبي", perUsd: 3.75,
  },
  BH: {
    code: "BH", name: "Bahrain", nameAr: "البحرين",
    currency: "BHD", currencyAr: "د.ب", decimals: 3, vatRate: 10,
    vatAuthority: "National Bureau for Revenue (NBR)", vatAuthorityAr: "الجهاز الوطني للإيرادات",
    trnLabel: "VAT Account No.", trnLabelAr: "رقم حساب ضريبة القيمة المضافة", perUsd: 0.376,
  },
  OM: {
    code: "OM", name: "Oman", nameAr: "سلطنة عُمان",
    currency: "OMR", currencyAr: "ر.ع", decimals: 3, vatRate: 5,
    vatAuthority: "Oman Tax Authority", vatAuthorityAr: "جهاز الضرائب",
    trnLabel: "VATIN", trnLabelAr: "الرقم الضريبي", perUsd: 0.3845,
  },
  QA: {
    code: "QA", name: "Qatar", nameAr: "قطر",
    currency: "QAR", currencyAr: "ر.ق", decimals: 2, vatRate: 0,
    vatAuthority: "General Tax Authority", vatAuthorityAr: "الهيئة العامة للضرائب",
    trnLabel: "Tax ID", trnLabelAr: "الرقم الضريبي", perUsd: 3.64,
  },
  KW: {
    code: "KW", name: "Kuwait", nameAr: "الكويت",
    currency: "KWD", currencyAr: "د.ك", decimals: 3, vatRate: 0,
    vatAuthority: "Ministry of Finance", vatAuthorityAr: "وزارة المالية",
    trnLabel: "Tax ID", trnLabelAr: "الرقم الضريبي", perUsd: 0.307,
  },
};

export const CURRENCY_PER_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 84,
  ...Object.fromEntries(Object.values(COUNTRIES).map((c) => [c.currency, c.perUsd])),
};

export function decimalsFor(currency: string): 2 | 3 {
  return currency === "BHD" || currency === "KWD" || currency === "OMR" ? 3 : 2;
}

/** Indicative cross rate: how many `base` units one unit of `from` is worth. */
export function indicativeRate(from: string, base: string): number | null {
  if (from === base) return 1;
  const f = CURRENCY_PER_USD[from];
  const b = CURRENCY_PER_USD[base];
  if (!f || !b) return null;
  return Math.round((b / f) * 1e6) / 1e6;
}

/** Currency symbols / words seen on GCC invoices, mapped to ISO codes. */
export const CURRENCY_HINTS: [RegExp, string][] = [
  [/\bAED\b|(?<![\u0600-\u06FF])د\.?\s?إ\.?(?![\u0600-\u06FF])|درهم/i, "AED"],
  [/\bSAR\b|(?<![\u0600-\u06FF])ر\.?\s?س\.?(?![\u0600-\u06FF])|ريال سعودي|﷼/i, "SAR"],
  [/\bQAR\b|(?<![\u0600-\u06FF])ر\.?\s?ق\.?(?![\u0600-\u06FF])|ريال قطري/i, "QAR"],
  [/\bKWD\b|(?<![\u0600-\u06FF])د\.?\s?ك\.?(?![\u0600-\u06FF])|دينار كويتي/i, "KWD"],
  [/\bBHD\b|(?<![\u0600-\u06FF])د\.?\s?ب\.?(?![\u0600-\u06FF])|دينار بحريني/i, "BHD"],
  [/\bOMR\b|(?<![\u0600-\u06FF])ر\.?\s?ع\.?(?![\u0600-\u06FF])|ريال عماني/i, "OMR"],
  [/\bUSD\b|US\$|دولار/i, "USD"],
  [/\bEUR\b|€/i, "EUR"],
  [/\bGBP\b|£/i, "GBP"],
  [/\bINR\b|₹/i, "INR"],
];
