"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";

const tabs: { href: string; key: string; icon: IconName }[] = [
  { href: "/", key: "home", icon: "home" },
  { href: "/attars", key: "browse", icon: "grid" },
  { href: "/search", key: "search", icon: "search" },
  { href: "/finder", key: "finder", icon: "spark" },
  { href: "/shelf", key: "shelf", icon: "shelf" },
];

export function BottomTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-parchment/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium no-underline ${
                  active ? "text-amber" : "text-muted"
                }`}
              >
                <Icon name={tab.icon} className="h-5 w-5" />
                {t(tab.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
