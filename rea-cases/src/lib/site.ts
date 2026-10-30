/**
 * Central site config. SITE_URL defaults to a placeholder — set the
 * NEXT_PUBLIC_SITE_URL env var to your real deployed domain before building
 * for production, since sitemap.xml, robots.txt, canonical URLs and Open
 * Graph tags all depend on it. Normalized defensively so a scheme-less value
 * pasted from a hosting dashboard doesn't throw in `new URL()` at build time.
 */
function normalizeSiteUrl(raw: string): string {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/$/, "");
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || "https://rea-cases.example",
);

export const SITE_NAME = "REA Cases";

export const SITE_DESCRIPTION =
  "A searchable index of software that AI agents reverse-engineered and rebuilt — every case tagged by what the evidence actually shows: confirmed REA, other AI reverse engineering, clean-room rebuild, or unverified claim.";

/**
 * Provenance for the dataset. Everything in src/data is derived from the
 * upstream CC0 list at this commit — keep these in sync whenever the data is
 * refreshed, because the site shows them to readers as the as-of date.
 */
export const UPSTREAM = {
  name: "AIshihzong/awesome-reverse-engineer-anything",
  url: "https://github.com/AIshihzong/awesome-reverse-engineer-anything",
  license: "CC0-1.0",
  commit: "641331f4bdbe1a6cd7199d5d0215397bc6ae246d",
  /** When the upstream list last refreshed the entries this site mirrors. */
  snapshot: "2026-10-29",
  /** When the upstream link/figure check was run. */
  figuresChecked: "2026-10-21",
  /** When the per-case REA claim check was run. */
  claimsChecked: "2026-10-14",
} as const;
