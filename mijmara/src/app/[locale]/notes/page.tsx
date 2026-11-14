import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent, taxName } from "@/lib/content";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notes" });
  return pageMeta({ locale, title: t("title"), description: t("intro"), paths: { ar: href("ar", "/notes"), en: href("en", "/notes") } });
}

export default async function NotesPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "notes" });
  const documented = c.notes.filter((x) => x.description[locale]);
  const others = c.notes.filter((x) => !x.description[locale]);
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <h2 className="mb-4 text-2xl">{t("documented")}</h2>
      <ul className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documented.map((x) => (
          <li key={x.id} className="card relative p-6">
            <p className="text-xs text-gold-400">{taxName(c, "character", x.family, locale)}</p>
            <h3 className="mb-2 text-2xl"><Link className="no-underline after:absolute after:inset-0" href={href(locale, "/notes/[slug]", { slug: x.slug[locale] })}>{x.name[locale]}</Link></h3>
            <p className="line-clamp-3 text-sm text-sand-300">{x.description[locale]}</p>
          </li>
        ))}
      </ul>
      <h2 className="mb-4 text-2xl">{t("others")}</h2>
      <ul className="flex flex-wrap gap-2">
        {others.map((x) => <li key={x.id}><Link className="chip no-underline hover:border-gold-500" href={href(locale, "/notes/[slug]", { slug: x.slug[locale] })}>{x.name[locale]}</Link></li>)}
      </ul>
    </>
  );
}
