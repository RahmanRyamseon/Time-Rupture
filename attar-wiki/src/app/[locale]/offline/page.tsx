import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default async function OfflinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="container-wiki py-16">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-3xl font-semibold">{t("pwa.offlineTitle")}</h1>
        <p className="mt-3 text-muted">{t("pwa.offlineBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shelf" className="btn-primary">
            {t("shelf.title")}
          </Link>
          <Link href="/" className="btn-secondary">
            {t("nav.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
