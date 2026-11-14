import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { href } from "@/lib/paths";
import type { Locale } from "@/lib/types";
import { Logo } from "./Icon";

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const n = await getTranslations({ locale, namespace: "nav" });
  const pages: [string, string][] = locale === "ar"
    ? [[href(locale, "/about"), "عن الموسوعة"], [href(locale, "/contributing"), "دليل المساهمة"], [href(locale, "/citation-policy"), "سياسة المصادر"], [href(locale, "/image-policy"), "سياسة الصور"], [href(locale, "/privacy"), "الخصوصية"], [href(locale, "/terms"), "الشروط"]]
    : [[href(locale, "/about"), "About"], [href(locale, "/contributing"), "Contributing guide"], [href(locale, "/citation-policy"), "Citation policy"], [href(locale, "/image-policy"), "Image policy"], [href(locale, "/privacy"), "Privacy"], [href(locale, "/terms"), "Terms"]];
  return (
    <footer className="border-t border-oud-700 bg-ink">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 pb-28 sm:px-6 md:grid-cols-3 md:pb-10">
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2"><Logo className="h-8 w-8" /><strong className="font-display text-xl text-gold-300">{locale === "ar" ? "مِجمَرة" : "Mijmara"}</strong></div>
          <p className="text-sand-100">{t("independent")}</p>
          <p className="text-sm text-sand-300">{t("noSales")}</p>
          <p className="text-sm text-sand-300">{t("license")}</p>
        </div>
        <nav aria-label={t("pages")}>
          <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-1">
            {pages.map(([to, label]) => <li key={to}><Link href={to}>{label}</Link></li>)}
            <li><Link href={href(locale, "/contribute")}>{n("contribute")}</Link></li>
            <li><Link href={href(locale, "/settings")}>{n("settings")}</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
