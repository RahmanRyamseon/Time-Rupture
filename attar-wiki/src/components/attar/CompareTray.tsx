"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { compareStore } from "@/lib/client/store";

export function CompareTray() {
  const t = useTranslations("compare");
  const items = compareStore.useStore();
  const pathname = usePathname();
  if (items.length === 0 || pathname.startsWith("/compare")) return null;
  return (
    <div className="fixed inset-x-3 bottom-20 z-30 flex items-center justify-between gap-3 rounded-full border border-line bg-bark px-4 py-2 text-sm text-parchment shadow-lg md:bottom-6 md:left-6 md:right-auto">
      <span>{t("tray", { count: items.length })}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-full px-3 py-1.5 text-gold-soft hover:text-white" onClick={() => compareStore.write([])}>
          {t("clear")}
        </button>
        <Link
          href={{ pathname: "/compare", query: { items: items.map((i) => i.slug).join(",") } }}
          className="rounded-full bg-gold px-4 py-1.5 font-semibold text-ink no-underline hover:bg-gold-soft"
        >
          {t("open")}
        </Link>
      </div>
    </div>
  );
}
