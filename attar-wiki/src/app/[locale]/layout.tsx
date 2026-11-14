import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Fraunces, Inter, Noto_Sans_Devanagari, Noto_Serif_Devanagari } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { CompareTray } from "@/components/attar/CompareTray";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ShelfSync } from "@/components/providers/ShelfSync";
import { PwaProvider } from "@/components/providers/PwaProvider";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const devaSans = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  variable: "--font-deva-sans",
  display: "swap",
  preload: false,
});
const devaSerif = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["500", "700"],
  variable: "--font-deva-serif",
  display: "swap",
  preload: false,
});

const SPLASH: [number, number, number][] = [
  [1290, 2796, 3],
  [1179, 2556, 3],
  [1170, 2532, 3],
  [1125, 2436, 3],
  [828, 1792, 2],
  [750, 1334, 2],
  [1640, 2360, 2],
  [2048, 2732, 2],
];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#3b2414",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${SITE_NAME}: ${t("tagline")}`, template: `%s · ${SITE_NAME}` },
    description: t("description"),
    applicationName: SITE_NAME,
    openGraph: { siteName: SITE_NAME, type: "website", locale: locale === "hi" ? "hi_IN" : "en_IN" },
    twitter: { card: "summary" },
    icons: { icon: "/icon.png", apple: "/icons/apple-touch-icon.png" },
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "default",
      startupImage: SPLASH.map(([w, h, r]) => ({
        url: `/splash/splash-${w}x${h}.png`,
        media: `(device-width: ${w / r}px) and (device-height: ${h / r}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
      })),
    },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("site");
  const fontVars = [fraunces.variable, inter.variable, locale === "hi" ? `${devaSans.variable} ${devaSerif.variable}` : ""].join(" ");

  return (
    <html lang={locale === "hi" ? "hi-IN" : "en-IN"} className={fontVars}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
          {t("skip")}
        </a>
        <NextIntlClientProvider>
          <PwaProvider>
            <AuthProvider>
              <ShelfSync />
              <SiteHeader />
              <main id="main" className="min-h-[60vh]">
                {children}
              </main>
              <SiteFooter />
              <BottomTabBar />
              <CompareTray />
              <InstallPrompt />
            </AuthProvider>
          </PwaProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
