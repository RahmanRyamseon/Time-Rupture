import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent } from "@/lib/content";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ProductsBrowser, type ProductFilters } from "@/components/ProductsBrowser";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "list" });
  return pageMeta({ locale, title: t("productsTitle"), description: t("productsIntro"), paths: { ar: href("ar", "/products"), en: href("en", "/products") } });
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "list" });
  const c = await getContent();
  const filters: ProductFilters = { category: sp.category, origin: sp.origin, house: sp.house, occasion: sp.occasion, season: sp.season, strength: sp.strength, family: sp.family, concentration: sp.concentration, gender: sp.gender, note: sp.note, page: sp.page };
  return (
    <>
      <PageHeader title={t("productsTitle")} intro={t("productsIntro")} />
      <ProductsBrowser c={c} locale={locale} filters={filters} action={href(locale, "/products")} />
    </>
  );
}
