/**
 * Central site config. SITE_URL defaults to a placeholder — set the
 * NEXT_PUBLIC_SITE_URL env var to the real deployed domain, since legal-page
 * canonical URLs and JSON-LD below depend on it being correct.
 */
function normalizeSiteUrl(raw: string): string {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/$/, "");
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || "https://edurozgar.example.in");

export const SITE_NAME = "EduRozgar India";
