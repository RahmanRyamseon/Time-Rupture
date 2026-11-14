"use client";
import { useTranslations } from "next-intl";
import { setShelf, shelfStore } from "@/lib/client/shelf";
import { SHELF_STATUSES, type ShelfStatus } from "@/lib/types";

export function ShelfButton({ attarId, slug, name }: { attarId: string; slug: string; name: string }) {
  const t = useTranslations("shelf");
  const shelf = shelfStore.useStore();
  const current = shelf[attarId]?.status ?? null;
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">{t("add")}</legend>
      {SHELF_STATUSES.map((s: ShelfStatus) => (
        <button
          key={s}
          type="button"
          aria-pressed={current === s}
          onClick={() => setShelf({ attarId, slug, name, status: s }, current === s ? null : s)}
          className={`chip ${current === s ? "border-amber bg-amber text-white hover:border-amber" : ""}`}
        >
          {t(s)}
        </button>
      ))}
    </fieldset>
  );
}
