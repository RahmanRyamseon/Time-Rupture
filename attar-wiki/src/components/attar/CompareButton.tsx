"use client";
import { useTranslations } from "next-intl";
import { compareStore, MAX_COMPARE } from "@/lib/client/store";
import { Icon } from "@/components/ui/Icon";

export function CompareButton({ slug, name }: { slug: string; name: string }) {
  const t = useTranslations("attar");
  const items = compareStore.useStore();
  const inCompare = items.some((i) => i.slug === slug);
  const full = items.length >= MAX_COMPARE && !inCompare;
  return (
    <button
      type="button"
      className="btn-secondary"
      aria-pressed={inCompare}
      disabled={full}
      onClick={() =>
        compareStore.write(inCompare ? items.filter((i) => i.slug !== slug) : [...items, { slug, name }].slice(-MAX_COMPARE))
      }
    >
      <Icon name={inCompare ? "check" : "compare"} className="h-4 w-4" />
      {inCompare ? t("inCompare") : t("compare")}
    </button>
  );
}
