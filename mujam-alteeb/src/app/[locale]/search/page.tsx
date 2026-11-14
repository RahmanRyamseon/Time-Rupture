import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { SearchClient } from "@/components/client/SearchClient";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return pageMeta({ locale, title: t("title"), description: t("hint"), paths: { ar: href("ar", "/search"), en: href("en", "/search") }, noindex: true });
}

export default async function SearchPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "search" });
  return (
    <>
      <PageHeader title={t("title")} intro={t("hint")} />
      <Suspense><SearchClient locale={locale} contributeHref={href(locale, "/contribute")} /></Suspense>
    </>
  );
}
