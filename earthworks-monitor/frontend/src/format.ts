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
