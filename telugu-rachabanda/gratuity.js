// End-of-service gratuity rules used by the calculator on /g/gratuity (and by scripts/test.mjs).
// Only countries whose law was checked against an official source are calculated.
// UAE: Federal Decree-Law 33/2021 Art. 51. Saudi Arabia: Labor Law Arts. 84–85.
export function gratuity({ country, monthly, years, resigned }) {
  if (!(monthly > 0) || !(years >= 0)) return 0;
  if (country === "uae") {
    if (years < 1) return 0;
    const daily = monthly / 30;
    const amount = Math.min(years, 5) * 21 * daily + Math.max(years - 5, 0) * 30 * daily;
    return Math.min(amount, monthly * 24);
  }
  if (country === "saudi") {
    const full = Math.min(years, 5) * (monthly / 2) + Math.max(years - 5, 0) * monthly;
    if (!resigned) return full;
    if (years < 2) return 0;
    if (years <= 5) return full / 3;
    if (years < 10) return (full * 2) / 3;
    return full;
  }
  return 0;
}
