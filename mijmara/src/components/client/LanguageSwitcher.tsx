"use client";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/types";
import { Icon } from "../Icon";

/**
 * Each page declares its counterpart through <link rel="alternate" hreflang>.
 * We read that at click time, so entity pages switch to the right translated slug.
 */
export function LanguageSwitcher({ locale, label, ariaLabel }: { locale: Locale; label: string; ariaLabel: string }) {
  const pathname = usePathname();
  const other: Locale = locale === "ar" ? "en" : "ar";
  const fallback = other === "en" ? "/en" : "/";
  function go(e: React.MouseEvent<HTMLAnchorElement>) {
    const link = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${other}"]`);
    if (link?.href) {
      e.preventDefault();
      const u = new URL(link.href);
      window.location.assign(u.pathname + window.location.search);
    }
  }
  return (
    <a href={fallback} onClick={go} hrefLang={other} lang={other} className="btn btn-ghost !px-3 text-sm" aria-label={ariaLabel} data-path={pathname}>
      <Icon name="globe" className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span><span className="sm:hidden">{other === "en" ? "EN" : "ع"}</span>
    </a>
  );
}
