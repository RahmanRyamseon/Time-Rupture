import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/metadata";
import { ShelfView } from "./ShelfView";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata("/shelf", locale, t("shelf.title"), null, { robots: { index: false } });
}

export default async function ShelfPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shelf");
  return (
    <div className="container-wiki py-10">
      <h1 className="text-4xl font-semibold">{t("title")}</h1>
      <ShelfView />
    </div>
  );
}
