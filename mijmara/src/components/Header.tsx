import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { href } from "@/lib/paths";
import type { Locale } from "@/lib/types";
import { Icon, Logo } from "./Icon";
import { LanguageSwitcher } from "./client/LanguageSwitcher";
import { AccountLink } from "./client/AccountLink";

export async function Header({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const s = await getTranslations({ locale, namespace: "site" });
  const links = [
    { to: href(locale, "/products"), label: t("products") },
    { to: href(locale, "/houses"), label: t("houses") },
    { to: href(locale, "/oud-origins"), label: t("origins") },
    { to: href(locale, "/notes"), label: t("notes") },
    { to: href(locale, "/culture"), label: t("culture") },
    { to: href(locale, "/guides"), label: t("guides") },
    { to: href(locale, "/matcher"), label: t("matcher") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-oud-700/70 bg-ink/90 backdrop-blur supports-[backdrop-filter]:bg-ink/75">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link prefetch={false} href={href(locale, "/")} className="flex items-center gap-2 no-underline">
          <Logo />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-2xl text-gold-300">{s("name")}</span>
            <span className="hidden text-xs text-sand-300 min-[400px]:block">{s("tagline")}</span>
          </span>
        </Link>
        <nav aria-label={t("primary")} className="ms-6 hidden flex-1 lg:block">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.95rem]">
            {links.map((l) => (
              <li key={l.to}><Link prefetch={false} href={l.to} className="text-sand-100 no-underline hover:text-gold-300">{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <Link prefetch={false} href={href(locale, "/search")} className="btn btn-ghost !px-3" aria-label={t("search")}><Icon name="search" /></Link>
          <AccountLink signInHref={href(locale, "/sign-in")} accountHref={href(locale, "/account")} signInLabel={t("signIn")} accountLabel={t("account")} />
          <LanguageSwitcher locale={locale} label={t("language")} ariaLabel={t("languageLabel")} />
        </div>
      </div>
    </header>
  );
}
