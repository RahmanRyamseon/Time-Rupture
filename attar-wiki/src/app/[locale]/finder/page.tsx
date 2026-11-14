import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/metadata";
import { Finder } from "./Finder";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata("/finder", locale, t("finder.title"), t("finder.intro"));
}

export default async function FinderPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("finder");
  return (
    <div className="container-wiki py-10">
      <h1 className="text-4xl font-semibold">{t("title")}</h1>
      <p className="reading mt-3 text-lg text-muted">{t("intro")}</p>
      <Finder />
    </div>
  );
}
