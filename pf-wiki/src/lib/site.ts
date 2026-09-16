/**
 * Central site config. SITE_URL defaults to a placeholder — set the
 * NEXT_PUBLIC_SITE_URL env var to your real deployed domain before
 * building for production, since sitemap.xml, robots.txt, canonical URLs,
 * and Open Graph tags all depend on it being correct.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://pf-wiki.example").replace(/\/$/, "");

export const SITE_NAME = "PF Wiki";

export const SITE_DESCRIPTION =
  "PF Wiki is a free, unofficial reference for Provident Fund (EPF/EPFO) problems — UAN activation, claim rejections, PF transfer, KYC mismatches, TDS, EPS pension, and the 2026 EPFO 3.0 migration — with sourced fixes and real solutions people report worked.";
