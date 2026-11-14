import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { STATIC_PAGES, type StaticPageKey } from "@/content/pages";
import { Markdown } from "@/components/wiki/Markdown";
import { pageMetadata } from "@/lib/metadata";
import { routing } from "@/i18n/routing";
import { SITE_NAME } from "@/lib/site";

type Props = { params: Promise<{ locale: string; page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => Object.keys(STATIC_PAGES).map((page) => ({ locale, page })));
}

const get = (page: string) => (page in STATIC_PAGES ? STATIC_PAGES[page as StaticPageKey] : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  const p = get(page);
  if (!p) return {};
  const t = await getTranslations({ locale, namespace: "site" });
  return pageMetadata(`/${page}`, locale, locale === "hi" ? p.title.hi : p.title.en, t("description"));
}

export default async function StaticPage({ params }: Props) {
  const { locale, page } = await params;
  setRequestLocale(locale);
  const p = get(page);
  if (!p) notFound();
  const body = (locale === "hi" ? p.hi : p.en).replaceAll("{{name}}", SITE_NAME);
  return (
    <div className="container-wiki py-10">
      <article className="reading">
        <h1 className="text-4xl font-semibold">{locale === "hi" ? p.title.hi : p.title.en}</h1>
        <hr className="gold-rule my-6" />
        <Markdown>{body}</Markdown>
      </article>
    </div>
  );
}
