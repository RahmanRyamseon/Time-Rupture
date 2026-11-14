/** Pick the Hindi variant of a content field when viewing in Hindi and it exists. */
export function pick(locale: string, en: string | null | undefined, hi: string | null | undefined) {
  if (locale === "hi" && hi && hi.trim()) return { text: hi, isFallback: false };
  return { text: en ?? null, isFallback: locale === "hi" && Boolean(en) };
}

export function formatDate(value: string | Date, locale: string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatInr(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN", { maximumFractionDigits: 0 }).format(value);
}
