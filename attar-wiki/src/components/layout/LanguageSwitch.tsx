"use client";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitch() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "hi" : "en";
  return (
    <Link
      href={pathname}
      locale={other}
      className="btn-ghost px-3 text-sm"
      aria-label={t("languageLabel")}
      lang={other}
      hrefLang={other}
    >
      {t("language")}
    </Link>
  );
}
