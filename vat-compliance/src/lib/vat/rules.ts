// Deterministic verification rules for Bahrain VAT Decree-Law 48/2018 and its
// Executive Regulations. Keyword lists below (blocked-input categories,
// NBR zero-rated food items, exempt categories) are illustrative starting
// points, not a verbatim reproduction of the NBR's published lists — an
// actual audit workpaper should have a human reviewer confirm classification
// against the current official lists before relying on this tool's verdicts.

export const VAT_RATE = 0.1;
export const AMOUNT_TOLERANCE = 0.01; // BHD; allows for 3-decimal-place rounding

const BLOCKED_INPUT_KEYWORDS = [
  "entertainment",
  "restaurant",
  "catering",
  "hospitality",
  "gift",
  "personal use",
  "club membership",
  "golf",
  "yacht",
  "recreational",
];

const ZERO_RATED_FOOD_KEYWORDS = [
  "rice",
  "bread",
  "milk",
  "vegetable",
  "fruit",
  "meat",
  "fish",
  "eggs",
  "flour",
  "infant formula",
];

const EXEMPT_KEYWORDS = [
  "residential rent",
  "residential lease",
  "local passenger transport",
  "bare land",
  "financial service margin",
];

function matchesAny(text: string, keywords: string[]): boolean {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k));
}

export function isValidTrnFormat(trn: string): boolean {
  const digits = trn.replace(/[\s-]/g, "");
  return /^\d{10,15}$/.test(digits);
}

export type Side = "ap" | "ar";

export interface VerifyInput {
  inv: string;
  date: string; // ISO
  party: string;
  trn: string;
  desc: string;
  net: number;
  vat: number;
  gross: number;
  country: string;
  lineCurrency: string;
}

export interface VerifyOptions {
  periodStart?: string; // ISO
  periodEnd?: string; // ISO
  reportingCurrency?: string;
}

export interface VerifyResult {
  nature: string;
  status: "Verified" | "Warning" | "Exception";
  findings: string[];
}

function classifyNature(desc: string, side: Side, isCrossBorder: boolean): string {
  if (side === "ap" && matchesAny(desc, BLOCKED_INPUT_KEYWORDS)) return "Blocked input";
  if (matchesAny(desc, EXEMPT_KEYWORDS)) return "Exempt";
  if (matchesAny(desc, ZERO_RATED_FOOD_KEYWORDS)) return "Zero-rated";
  if (isCrossBorder) return side === "ap" ? "Import (reverse charge)" : "Export (zero-rated)";
  return "Standard-rated";
}

const EXCEPTION_MARKERS = ["not recoverable", "does not equal", "Missing", "not a valid"];

export function verifyLine(input: VerifyInput, side: Side, opts: VerifyOptions = {}): VerifyResult {
  const findings: string[] = [];
  const reportingCurrency = opts.reportingCurrency ?? "BHD";

  const country = input.country.trim();
  const isCrossBorder = country !== "" && !/^(bahrain|bh|bhr)$/i.test(country);
  const nature = classifyNature(input.desc, side, isCrossBorder);

  // Invoice completeness — Art. 53
  if (!input.inv.trim()) findings.push("Missing invoice number (Art. 53 completeness).");
  if (!input.date.trim()) findings.push("Missing invoice/tax point date (Art. 53 completeness).");
  if (side === "ap" && !input.trn.trim()) {
    findings.push("Missing supplier TRN — input VAT is not recoverable without a valid tax invoice (Art. 53).");
  } else if (input.trn.trim() && !isValidTrnFormat(input.trn)) {
    findings.push(`TRN "${input.trn}" is not a valid 10–15 digit format.`);
  }

  // VAT tie-out (10% of net, per treatment)
  const zeroVatTreatment = nature === "Zero-rated" || nature === "Exempt" || nature === "Export (zero-rated)";
  const expectedVat = zeroVatTreatment ? 0 : Math.round(input.net * VAT_RATE * 1000) / 1000;
  if (Math.abs(input.vat - expectedVat) > AMOUNT_TOLERANCE) {
    findings.push(
      `VAT booked (${input.vat.toFixed(3)}) does not equal expected ${expectedVat.toFixed(3)} (10% of net, per treatment "${nature}").`
    );
  }

  // Gross tie-out
  const expectedGross = Math.round((input.net + input.vat) * 1000) / 1000;
  if (Math.abs(input.gross - expectedGross) > AMOUNT_TOLERANCE) {
    findings.push(`Total (${input.gross.toFixed(3)}) does not equal Net + VAT (${expectedGross.toFixed(3)}).`);
  }

  // Blocked input — Art. 42(C)
  if (side === "ap" && nature === "Blocked input") {
    findings.push("Input VAT not recoverable — blocked input category under Art. 42(C).");
  }

  // Import reverse charge — Art. 9
  if (side === "ap" && nature === "Import (reverse charge)") {
    findings.push("Import — self-account under reverse charge (Art. 9): report as both output and input VAT (return Box 10a).");
  }

  // Export zero-rating consistency — Art. 53
  if (side === "ar" && isCrossBorder && input.vat > AMOUNT_TOLERANCE) {
    findings.push("Export invoice carries non-zero VAT — verify zero-rating eligibility under Art. 53.");
  }

  // Tax point / period — Art. 24/25
  if (opts.periodStart && opts.periodEnd && input.date) {
    if (input.date < opts.periodStart || input.date > opts.periodEnd) {
      findings.push(`Tax point ${input.date} falls outside the declared period (Art. 24/25).`);
    }
  }

  // FX
  if (input.lineCurrency && input.lineCurrency.toUpperCase() !== reportingCurrency.toUpperCase()) {
    findings.push(
      `Booked in ${input.lineCurrency.toUpperCase()}, not ${reportingCurrency} — confirm the NBR-approved conversion rate was applied.`
    );
  }

  const hasException = findings.some((f) => EXCEPTION_MARKERS.some((marker) => f.includes(marker)));
  const status: VerifyResult["status"] = findings.length === 0 ? "Verified" : hasException ? "Exception" : "Warning";

  return { nature, status, findings };
}

/** Returns the zero-based indices of lines that share invoice + party + amounts with another line. */
export function detectDuplicates<T extends { inv: string; party: string; net: number; vat: number }>(
  lines: T[]
): Set<number> {
  const seen = new Map<string, number>();
  const dupIndices = new Set<number>();
  lines.forEach((l, i) => {
    if (!l.inv.trim()) return;
    const key = `${l.inv.trim().toLowerCase()}|${l.party.trim().toLowerCase()}|${l.net.toFixed(3)}|${l.vat.toFixed(3)}`;
    const prior = seen.get(key);
    if (prior !== undefined) {
      dupIndices.add(i);
      dupIndices.add(prior);
    } else {
      seen.set(key, i);
    }
  });
  return dupIndices;
}
