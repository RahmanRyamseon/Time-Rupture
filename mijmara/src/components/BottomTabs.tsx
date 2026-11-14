import { getTranslations } from "next-intl/server";
import { href } from "@/lib/paths";
import type { Locale } from "@/lib/types";
import { TabLink } from "./client/TabLink";

export async function BottomTabs({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const tabs = [
    { to: href(locale, "/"), label: t("home"), icon: "home", exact: true },
    { to: href(locale, "/search"), label: t("search"), icon: "search" },
    { to: href(locale, "/matcher"), label: t("matcher"), icon: "spark" },
    { to: href(locale, "/my-collection"), label: t("collection"), icon: "shelf" },
    { to: href(locale, "/products"), label: t("products"), icon: "menu" },
  ];
  return (
    <nav aria-label={t("tabs")} className="fixed inset-x-0 bottom-0 z-40 border-t border-oud-700 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map((tab) => (
          <li key={tab.to}><TabLink {...tab} /></li>
        ))}
      </ul>
    </nav>
  );
}
