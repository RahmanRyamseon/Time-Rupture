import type { VerificationCheck } from "@/lib/types";

/**
 * Most verdict strings open with their own label ("Confirmed. One function
 * is byte-matched…"), but a few go straight into the detail. Strip the
 * duplicate so a page can bold the label once and print the rest after it.
 */
export function verdictDetail(check: VerificationCheck): string {
  const prefix = new RegExp(`^${check.verdictLabel}[.,]?\\s*`, "i");
  return check.verdict.replace(prefix, "");
}

export const README_SAYS: Record<VerificationCheck["readmeSaysRea"], string> = {
  yes: "Yes — the project README says REA was used",
  no: "No — the README does not mention REA",
  elsewhere: "Not in the README, but documented elsewhere in the repo",
  unknown: "Unknown — no README to check",
};

export const README_SAYS_SHORT: Record<VerificationCheck["readmeSaysRea"], string> = {
  yes: "Yes",
  no: "No",
  elsewhere: "Elsewhere in the repo",
  unknown: "—",
};
