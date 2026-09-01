export function fmtBhd(bhd: number): string {
  return `BD ${bhd.toLocaleString("en-BH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtFils(fils: number): string {
  if (Math.abs(fils) >= 1000) return fmtBhd(fils / 1000);
  return `${fils.toLocaleString("en-BH", { maximumFractionDigits: 2 })} fils`;
}

export function fmtPoints(n: number): string {
  return Math.round(n).toLocaleString("en-BH");
}

/** Current billing-cycle key, e.g. "2026-08". Caps are tracked and reset against this key. */
export function currentCycleKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function nextCycleStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Most card names already start with the bank's short name (e.g. "BisB Visa Gold") — avoid "BisB BisB Visa Gold". */
export function cardDisplayName(card: { bankShort: string; cardName: string }): string {
  return card.cardName.toLowerCase().startsWith(card.bankShort.toLowerCase())
    ? card.cardName
    : `${card.bankShort} ${card.cardName}`;
}
