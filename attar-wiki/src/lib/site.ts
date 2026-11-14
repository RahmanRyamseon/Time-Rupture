export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Attar Wiki";
// NEXT_PUBLIC_SITE_URL wins; on Netlify fall back to the deploy's primary URL (URL is set at build time).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_TAGLINE = "The open encyclopedia of attars and perfume oils";

/** Absolute URL for a locale-aware path. English has no prefix. */
export function absoluteUrl(path: string, locale: string = "en") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const prefixed = locale === "en" ? clean : `/${locale}${clean === "/" ? "" : clean}`;
  return `${SITE_URL}${prefixed}`;
}

export function hasSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export const ISR_SECONDS = 600;
