import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComparisonCards } from "@/components/compare/ComparisonCards";
import { BrandPairLinks, BudgetLinks } from "@/components/compare/GuideLinks";
import { pageMetadata } from "@/lib/metadata";

export const revalidate = 600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compared" });
  return pageMetadata("/compared", locale, t("indexTitle"), t("indexBody"));
}

export default async function ComparisonsIndex({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="container-wiki py-10">
      <p className="eyebrow text-amber">{t("compared.eyebrow")}</p>
      <h1 className="mt-2 text-4xl font-semibold">
        {t("compared.indexTitle")}
      </h1>
      <p className="reading mt-3 text-lg text-ink/85">
        {t("compared.indexBody")}
      </p>
      <section aria-labelledby="by-budget" className="mt-10">
        <h2 id="by-budget" className="text-2xl font-semibold">
          {t("brands.byBudget")}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          {t("brands.byBudgetHelp")}
        </p>
        <BudgetLinks />
      </section>
      <section aria-labelledby="by-brand" className="mt-10">
        <h2 id="by-brand" className="text-2xl font-semibold">
          {t("brands.index")}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">{t("brands.indexHelp")}</p>
        <BrandPairLinks />
      </section>
      <section aria-labelledby="by-style" className="mt-10">
        <h2 id="by-style" className="mb-4 text-2xl font-semibold">
          {t("brands.byStyle")}
        </h2>
        <ComparisonCards locale={locale} />
      </section>
    </div>
  );
}
