import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/types";
import { RetryButton } from "@/components/client/RetryButton";

type Params = { params: Promise<{ locale: Locale }> };
export const metadata = { robots: { index: false } };
export default async function Offline({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "offline" });
  return (
    <div className="py-20 text-center">
      <h1 className="mb-4 text-4xl">{t("title")}</h1>
      <p className="mx-auto mb-8 max-w-md text-sand-300">{t("text")}</p>
      <RetryButton label={t("retry")} />
    </div>
  );
}
