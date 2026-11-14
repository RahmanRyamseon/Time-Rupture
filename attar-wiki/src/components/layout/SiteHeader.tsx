import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { SITE_NAME } from "@/lib/site";
import { SearchBox } from "./SearchBox";
import { LanguageSwitch } from "./LanguageSwitch";
import { AccountMenu } from "./AccountMenu";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const primary = [
    { href: "/attars", label: t("attars") },
    { href: "/notes", label: t("notes") },
    { href: "/houses", label: t("houses") },
    { href: "/regions", label: t("regions") },
    { href: "/glossary", label: t("glossary") },
    { href: "/guides", label: t("guides") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-parchment/95 backdrop-blur supports-[backdrop-filter]:bg-parchment/80">
      <div className="container-wiki flex h-16 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-bark no-underline">
          <LogoMark className="h-9 w-9" />
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">{SITE_NAME}</span>
        </Link>

        <nav aria-label="Primary" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1 text-sm">
            {primary.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded-full px-3 py-2 font-medium text-bark no-underline hover:bg-sand">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden w-full max-w-xs md:block">
          <SearchBox compact />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Link href="/search" className="btn-ghost px-3 md:hidden" aria-label={t("search")}>
            <Icon name="search" />
          </Link>
          <Link href="/finder" className="btn-ghost hidden px-3 sm:inline-flex lg:hidden xl:inline-flex">
            <Icon name="spark" className="h-4 w-4" />
            <span>{t("finderLong")}</span>
          </Link>
          <LanguageSwitch />
          <AccountMenu />
          <details className="relative lg:hidden">
            <summary className="btn-ghost cursor-pointer list-none px-3 [&::-webkit-details-marker]:hidden" aria-label={t("menu")}>
              <Icon name="menu" />
            </summary>
            <nav aria-label={t("menu")} className="card absolute right-0 top-12 z-50 w-56 p-2">
              <ul className="text-sm">
                {[...primary, { href: "/compare", label: t("compare") }, { href: "/contribute", label: t("contribute") }, { href: "/about", label: t("about") }].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="block rounded-lg px-3 py-2.5 font-medium text-bark no-underline hover:bg-sand">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
