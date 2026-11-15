import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductRows } from "@/lib/data/wiki";
import { brandPairs } from "@/lib/brands";
import { BUDGETS, budgetSlug, entryPrice } from "@/lib/compare";

/** Budget pages with how many attars each lists. */
export async function BudgetLinks() {
  const t = await getTranslations();
  const rows = await getProductRows();
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {BUDGETS.map((max) => {
        const count = rows.filter((p) => {
          const e = entryPrice(p.prices);
          return e !== null && e.price <= max;
        }).length;
        return (
          <li key={max}>
            <Link href={`/best/${budgetSlug(max)}`} className="card block p-4 no-underline hover:shadow-md">
              <span className="font-display text-xl font-semibold text-bark">{t("best.under", { max })}</span>
              <span className="block text-sm text-muted">{t("compared.versions", { count })}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Brand-vs-brand pages. */
export async function BrandPairLinks() {
  const t = await getTranslations();
  const pairs = brandPairs(await getProductRows());
  return (
    <ul className="flex flex-wrap gap-2">
      {pairs.map((p) => (
        <li key={p.slug}>
          <Link href={`/compared/brands/${p.slug}`} className="chip min-h-10 px-4">
            {p.a.name} {t("brands.vs")} {p.b.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
