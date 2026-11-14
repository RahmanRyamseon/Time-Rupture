import type { Metadata } from "next";
import { absolute } from "./paths";
import type { Locale } from "./types";

export function pageMeta(opts: { locale: Locale; title: string; description: string; paths: { ar: string; en: string }; noindex?: boolean; type?: "article" | "website" }): Metadata {
  const { locale, title, description, paths } = opts;
  const desc = description.length > 158 ? description.slice(0, 155).trimEnd() + "…" : description;
  return {
    title,
    description: desc,
    alternates: {
      canonical: absolute(paths[locale]),
      languages: { ar: absolute(paths.ar), en: absolute(paths.en), "x-default": absolute(paths.ar) },
    },
    openGraph: { title, description: desc, url: absolute(paths[locale]), type: opts.type ?? "website" },
    twitter: { card: "summary", title, description: desc },
    robots: opts.noindex ? { index: false, follow: true } : undefined,
  };
}

export function articleJsonLd(opts: { locale: Locale; headline: string; description: string; url: string; dateModified: string; about?: string; citations?: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    inLanguage: opts.locale,
    dateModified: opts.dateModified,
    mainEntityOfPage: absolute(opts.url),
    url: absolute(opts.url),
    ...(opts.about ? { about: { "@type": "Thing", name: opts.about } } : {}),
    ...(opts.citations?.length ? { citation: opts.citations } : {}),
    publisher: { "@type": "Organization", name: opts.locale === "ar" ? "مِجمَرة" : "Mijmara" },
    isAccessibleForFree: true,
  };
}
