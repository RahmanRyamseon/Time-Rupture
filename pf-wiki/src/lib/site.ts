/**
 * Central site config. SITE_URL defaults to a placeholder — set the
 * NEXT_PUBLIC_SITE_URL env var to your real deployed domain before
 * building for production, since sitemap.xml, robots.txt, canonical URLs,
 * and Open Graph tags all depend on it being correct.
 *
 * Normalized defensively: a value with no scheme (e.g. a host pasted
 * straight from a hosting dashboard, like "providentfund.vercel.app")
 * would otherwise throw at build time wherever it's passed to `new URL()`
 * (e.g. `metadataBase` in the root layout) and take the whole production
 * build down with it.
 */
function normalizeSiteUrl(raw: string): string {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/$/, "");
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || "https://pf-wiki.example");

export const SITE_NAME = "PF Wiki";

export const SITE_DESCRIPTION =
  "PF Wiki is a free, unofficial reference for Provident Fund (EPF/EPFO) problems — UAN activation, claim rejections, PF transfer, KYC mismatches, TDS, EPS pension, and the 2026 EPFO 3.0 migration — with sourced fixes and real solutions people report worked.";
