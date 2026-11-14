import { getTranslations, setRequestLocale } from "next-intl/server";
import { href } from "@/lib/paths";
import { simpleMeta } from "@/lib/simple-page";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { AccountClient } from "@/components/client/AccountClient";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return simpleMeta((await params).locale, "/account", "nav", "account", "account"); }
export default async function Page({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "nav" });
  return (<><PageHeader title={t("account")} /><AccountClient links={{ collection: href(locale, "/my-collection"), moderation: href(locale, "/moderation"), signIn: href(locale, "/sign-in"), settings: href(locale, "/settings") }} /></>);
}
