import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent } from "@/lib/content";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "houses" });
  return pageMeta({ locale, title: t("title"), description: t("intro"), paths: { ar: href("ar", "/houses"), en: href("en", "/houses") } });
}

export default async function HousesPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "houses" });
  const houses = [...c.houses].sort((a, b) => (a.foundedYear ?? 9999) - (b.foundedYear ?? 9999));
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {houses.map((h) => (
          <li key={h.id} className="card relative p-6">
            <h2 className="mb-1 text-2xl"><Link prefetch={false} className="no-underline after:absolute after:inset-0" href={href(locale, "/houses/[slug]", { slug: h.slug[locale] })}>{h.name[locale]}</Link></h2>
            <p className="text-sm text-sand-300">{h.country[locale]}{h.foundedYear ? ` · ${t("founded")} ${h.foundedYear}` : ""}</p>
            <p className="mt-3 text-sm text-sand-400">{c.products.filter((p) => p.houseId === h.id).length} {locale === "ar" ? "منتج في الموسوعة" : "products here"}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
