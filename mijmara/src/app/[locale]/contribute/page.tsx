import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent } from "@/lib/content";
import { href } from "@/lib/paths";
import { simpleMeta } from "@/lib/simple-page";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ContributeClient } from "@/components/client/ContributeClient";
import Link from "next/link";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return simpleMeta((await params).locale, "/contribute", "contribute", "title", "intro", false); }

export default async function Page({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "contribute" });
  const products = c.products.map((p) => ({ id: p.id, label: p.name[locale] }));
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")}>
        <p className="text-sm"><Link href={href(locale, "/contributing")}>{locale === "ar" ? "اقرأ دليل المساهمة" : "Read the contributing guide"}</Link> · <Link href={href(locale, "/citation-policy")}>{locale === "ar" ? "سياسة المصادر" : "Citation policy"}</Link> · <Link href={href(locale, "/image-policy")}>{locale === "ar" ? "سياسة الصور" : "Image policy"}</Link></p>
      </PageHeader>
      <ContributeClient products={products} />
    </>
  );
}
