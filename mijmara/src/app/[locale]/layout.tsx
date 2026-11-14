import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/paths";
import type { Locale } from "@/lib/types";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomTabs } from "@/components/BottomTabs";
import { NumeralsApplier } from "@/components/client/NumeralsApplier";
import { InstallPrompt } from "@/components/client/InstallPrompt";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${t("name")} — ${t("tagline")}`, template: `%s · ${t("name")}` },
    description: t("description"),
    applicationName: t("name"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: t("name"), statusBarStyle: "black-translucent" },
    icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
    openGraph: { siteName: t("name"), locale: locale === "ar" ? "ar_AE" : "en_US", type: "website" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#120c09",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("site");
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preload" href={locale === "ar" ? "/fonts/plex-ar-400.woff2" : "/fonts/plex-lat-400.woff2"} as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="pattern antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 btn btn-gold">{t("skip")}</a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header locale={locale as Locale} />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">{children}</main>
          <Footer locale={locale as Locale} />
          <BottomTabs locale={locale as Locale} />
          <NumeralsApplier locale={locale as Locale} />
          <InstallPrompt />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
