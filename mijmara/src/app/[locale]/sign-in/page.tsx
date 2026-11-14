import { getTranslations, setRequestLocale } from "next-intl/server";
import { href } from "@/lib/paths";
import { simpleMeta } from "@/lib/simple-page";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { SignInClient } from "@/components/client/SignInClient";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return simpleMeta((await params).locale, "/sign-in", "auth"); }
export default async function Page({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "auth" });
  return (<><PageHeader title={t("title")} intro={t("intro")} /><SignInClient redirectPath={href(locale, "/account")} /></>);
}
