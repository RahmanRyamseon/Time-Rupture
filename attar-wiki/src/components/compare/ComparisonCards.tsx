import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getComparisonIndex, getStyleComparison } from "@/lib/data/wiki";
import { lowestPer10, type Per10 } from "@/lib/compare";
import { formatInr, pick } from "@/lib/i18n-content";

/** Index rows with the cheapest listed price per 10 units, per unit. */
async function getComparisonCards() {
  const index = await getComparisonIndex();
  return Promise.all(
    index.map(async (row) => {
      const data = await getStyleComparison(row.slug);
      const best: Partial<Record<Per10["unit"], number>> = {};
      for (const v of data?.versions ?? []) {
        const p = lowestPer10(v.prices);
        if (p && (best[p.unit] == null || p.value < best[p.unit]!)) best[p.unit] = p.value;
      }
      const houses = new Set((data?.versions ?? []).map((v) => v.house?.slug ?? v.attar.slug)).size;
      return { ...row, best, houses };
    }),
  );
}

export async function ComparisonCards({ locale, limit }: { locale: string; limit?: number }) {
  const t = await getTranslations();
  const cards = (await getComparisonCards()).slice(0, limit);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => {
        const name = pick(locale, c.name, c.name_hi).text ?? c.name;
        return (
          <li key={c.slug} className="card group relative p-5 transition-shadow hover:shadow-md">
            <h3 className="text-xl font-semibold leading-snug">
              <Link href={`/compared/${c.slug}`} className="text-bark no-underline after:absolute after:inset-0 group-hover:text-amber">
                {t("compared.title", { style: name })}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-muted">
              {t("compared.versions", { count: c.versions.length })} · {c.houses} {t("nav.houses").toLowerCase()}
            </p>
            {(["ml", "g"] as const).some((u) => c.best[u] != null) ? (
              <p className="mt-2 text-sm text-ink/85">
                {(["ml", "g"] as const)
                  .filter((u) => c.best[u] != null)
                  .map((u) => t("compared.from", { price: `₹${formatInr(c.best[u]!, locale)}`, unit: u }))
                  .join(" · ")}
              </p>
            ) : null}
            {c.summary && locale !== "hi" ? <p className="mt-2 line-clamp-2 text-sm text-muted">{c.summary}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

