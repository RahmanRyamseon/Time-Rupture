import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import { STATIC_PAGES, type StaticPageKey } from "@/lib/static-pages";
import type { Locale } from "@/lib/types";
import { PageHeader } from "./PageHeader";
import { Prose } from "./Prose";

export function staticMeta(key: StaticPageKey, locale: Locale): Metadata {
  const p = STATIC_PAGES[key];
  const route = `/${key}` as "/about";
  return pageMeta({ locale, title: p.title[locale], description: p.summary[locale], paths: { ar: href("ar", route), en: href("en", route) } });
}

export function StaticPageView({ k, locale }: { k: StaticPageKey; locale: Locale }) {
  setRequestLocale(locale);
  const p = STATIC_PAGES[k];
  return (
    <article className="max-w-3xl">
      <PageHeader title={p.title[locale]} intro={p.summary[locale]} />
      <Prose text={p.body[locale]} citeNumbers={new Map()} />
    </article>
  );
}
