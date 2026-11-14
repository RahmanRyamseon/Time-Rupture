import { pathnames, type AppPathname } from "@/i18n/routing";
import type { Locale } from "./types";

/** Build a public, localised URL path for an internal route. */
export function href(locale: Locale, route: AppPathname, params: Record<string, string> = {}, query?: Record<string, string>): string {
  const def = pathnames[route] as string | { ar: string; en: string };
  let path = typeof def === "string" ? def : def[locale];
  for (const [k, v] of Object.entries(params)) path = path.replace(`[${k}]`, v);
  if (locale !== "ar") path = path === "/" ? `/${locale}` : `/${locale}${path}`;
  if (query && Object.keys(query).length) path += `?${new URLSearchParams(query).toString()}`;
  return path;
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mijmara.netlify.app").replace(/\/$/, "");

export function absolute(path: string): string {
  return SITE_URL + encodeURI(decodeURI(path));
}

export const ENTITY_ROUTES = {
  product: "/products/[slug]",
  house: "/houses/[slug]",
  origin: "/oud-origins/[slug]",
  note: "/notes/[slug]",
  culture: "/culture/[slug]",
  guide: "/guides/[slug]",
} as const;
