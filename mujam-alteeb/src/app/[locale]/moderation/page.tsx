import { getTranslations, setRequestLocale } from "next-intl/server";
import { simpleMeta } from "@/lib/simple-page";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ModerationClient } from "@/components/client/ModerationClient";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return simpleMeta((await params).locale, "/moderation", "moderation", "title", "queue"); }
export default async function Page({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "moderation" });
  return (<><PageHeader title={t("title")} /><ModerationClient /></>);
}
