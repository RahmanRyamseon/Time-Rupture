import type { Metadata } from "next";
import { absoluteUrl } from "./site";

export function pageMetadata(path: string, locale: string, title: string, description?: string | null, extra: Partial<Metadata> = {}): Metadata {
  return {
    title,
    description: description ?? undefined,
    alternates: {
      canonical: absoluteUrl(path, locale),
      languages: { "en-IN": absoluteUrl(path, "en"), "hi-IN": absoluteUrl(path, "hi"), "x-default": absoluteUrl(path, "en") },
    },
    openGraph: { title, description: description ?? undefined, url: absoluteUrl(path, locale), type: "article" },
    ...extra,
  };
}
