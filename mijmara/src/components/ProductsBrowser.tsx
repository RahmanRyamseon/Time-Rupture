import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Content, Locale, Product } from "@/lib/types";
import { getVoteSummaries } from "@/lib/votes";
import { ProductCard } from "./ProductCard";

export type ProductFilters = { category?: string; origin?: string; house?: string; occasion?: string; season?: string; strength?: string };

export async function filterProducts(c: Content, f: ProductFilters): Promise<Product[]> {
  const votes = f.strength ? await getVoteSummaries() : null;
  return c.products.filter((p) =>
    (!f.category || p.category === f.category) &&
    (!f.origin || p.origins.includes(f.origin)) &&
    (!f.house || p.houseId === f.house) &&
    (!f.occasion || p.occasions.includes(f.occasion)) &&
    (!f.season || p.seasons.includes(f.season) || p.seasons.includes("all")) &&
    (!f.strength || Math.round(votes?.get(p.id)?.strength ?? -1) === Number(f.strength)),
  );
}

export async function ProductsBrowser({ c, locale, filters, action, lockCategory }: { c: Content; locale: Locale; filters: ProductFilters; action: string; lockCategory?: boolean }) {
  const t = await getTranslations({ locale, namespace: "list" });
  const cm = await getTranslations({ locale, namespace: "common" });
  const results = await filterProducts(c, filters);
  const opt = (type: string) => (c.taxonomy[type] ?? []).map((x) => ({ v: x.id, l: x.name[locale] }));
  const selects: { name: keyof ProductFilters; label: string; options: { v: string; l: string }[] }[] = [
    ...(lockCategory ? [] : [{ name: "category" as const, label: t("category"), options: opt("category") }]),
    { name: "origin", label: t("origin"), options: opt("origin_group") },
    { name: "house", label: t("house"), options: c.houses.map((h) => ({ v: h.id, l: h.name[locale] })) },
    { name: "occasion", label: t("occasion"), options: opt("occasion") },
    { name: "season", label: t("season"), options: opt("season").filter((s) => s.v !== "all") },
    { name: "strength", label: t("strength"), options: opt("strength") },
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <form action={action} method="get" className="card h-fit space-y-4 p-5" aria-label={t("filters")}>
        <h2 className="text-xl">{t("filters")}</h2>
        {selects.map((s) => (
          <label key={s.name} className="grid gap-1 text-sm">
            <span className="text-sand-300">{s.label}</span>
            <select name={s.name} defaultValue={filters[s.name] ?? ""} className="min-h-11">
              <option value="">{t("any")}</option>
              {s.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </label>
        ))}
        <div className="flex gap-2">
          <button className="btn btn-gold flex-1">{t("apply")}</button>
          <Link href={action} className="btn btn-ghost">{t("reset")}</Link>
        </div>
        <p className="text-xs text-sand-400">{t("strengthNote")}</p>
      </form>
      <section aria-live="polite">
        <p className="mb-4 text-sm text-sand-300">{cm("results", { count: results.length })}</p>
        {results.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{results.map((p) => <li key={p.id}><ProductCard p={p} c={c} locale={locale} /></li>)}</ul>
        ) : <p className="card p-6 text-sand-300">{t("empty")}</p>}
      </section>
    </div>
  );
}
