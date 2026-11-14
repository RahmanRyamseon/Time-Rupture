import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent } from "@/lib/content";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { MatcherClient } from "@/components/client/MatcherClient";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "matcher" });
  return pageMeta({ locale, title: t("title"), description: t("intro"), paths: { ar: href("ar", "/matcher"), en: href("en", "/matcher") } });
}

export default async function MatcherPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "matcher" });
  const opt = (type: string) => (c.taxonomy[type] ?? []).map((x) => ({ id: x.id, label: x.name[locale] }));
  const products = Object.fromEntries(c.products.map((p) => [p.id, { name: p.name[locale], house: c.houses.find((h) => h.id === p.houseId)?.name[locale] ?? "", href: href(locale, "/products/[slug]", { slug: p.slug[locale] }) }]));
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <MatcherClient locale={locale} options={{ occasion: opt("occasion"), season: opt("season").filter((s) => s.id !== "all"), character: opt("character"), strength: opt("strength") }} products={products} />
    </>
  );
}
