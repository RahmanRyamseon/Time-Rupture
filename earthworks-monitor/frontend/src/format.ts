import i18n, { numberLocale } from "./i18n";

export function formatArea(areaM2: number): string {
  const [value, unit] =
    areaM2 >= 1e6
      ? [areaM2 / 1e6, "km2"]
      : areaM2 >= 1e4
        ? [areaM2 / 1e4, "ha"]
        : [areaM2, "m2"];
  const number = new Intl.NumberFormat(numberLocale(), {
    maximumFractionDigits: unit === "m2" ? 0 : 2,
  }).format(value);
  return `${number} ${i18n.t(`units.${unit}`)}`;
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(numberLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** "12,340 ± 210" - a volume is never shown without its uncertainty. */
export function formatVolume(value: number, plusMinus: number): string {
  return `${formatNumber(value)} ± ${formatNumber(plusMinus)}`;
}

export function formatPercent(ratio: number, plusMinus: number | null): string {
  const base = `${formatNumber(ratio * 100, 1)}%`;
  return plusMinus === null ? base : `${base} ± ${formatNumber(plusMinus * 100, 1)}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(numberLocale(), { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
