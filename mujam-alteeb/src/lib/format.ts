import type { Locale } from "./types";

export function formatNumber(n: number, locale: Locale): string {
  // Always render Western digits on the server; the client swaps to Eastern Arabic digits
  // when the reader chose that setting (see NumeralsApplier) — keeps pages static and cacheable.
  return new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { maximumFractionDigits: 2 }).format(n);
}

export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(d);
}

const CURRENCY_AR: Record<string, string> = { AED: "درهم إماراتي", SAR: "ريال سعودي", KWD: "دينار كويتي", QAR: "ريال قطري", BHD: "دينار بحريني", OMR: "ريال عماني", USD: "دولار أمريكي", INR: "روبية هندية" };

export function formatPrice(min: number, max: number, currency: string, locale: Locale): string {
  const range = min === max ? formatNumber(min, locale) : `${formatNumber(min, locale)}–${formatNumber(max, locale)}`;
  return locale === "ar" ? `${range} ${CURRENCY_AR[currency] ?? currency}` : `${currency} ${range}`;
}

export function readingMinutes(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 180));
}
