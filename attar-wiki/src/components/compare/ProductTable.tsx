import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductRow } from "@/lib/data/wiki";
import { byPer10, entryPrice, lowestPer10 } from "@/lib/compare";
import { formatInr, pick } from "@/lib/i18n-content";

/** Drop a trailing "(House)" from a product name; the house is shown separately. */
export const shortName = (name: string) => name.replace(/\s*\([^()]*\)$/, "");

export function rankRows(products: ProductRow[]) {
  return products
    .map((p) => ({ product: p, name: p.name, per10: lowestPer10(p.prices), entry: entryPrice(p.prices) }))
    .sort(byPer10);
}

/** Ranked product list: cards on mobile, a table from md up. */
export async function ProductTable({ products, locale, caption }: { products: ProductRow[]; locale: string; caption: string }) {
  const t = await getTranslations();
  const rows = rankRows(products);
  const nd = <span className="italic text-muted">—</span>;

  const per10 = (r: (typeof rows)[number]) =>
    r.per10 ? (
      <span className="whitespace-nowrap font-semibold tabular-nums text-bark">
        ₹{formatInr(r.per10.value, locale)} <span className="text-xs font-normal text-muted">/ 10 {r.per10.unit}</span>
      </span>
    ) : (
      nd
    );
  const entry = (r: (typeof rows)[number]) =>
    r.entry ? (
      <span className="whitespace-nowrap tabular-nums">
        {t("attar.priceRowSingle", { min: formatInr(r.entry.price, locale), volume: r.entry.volume, unit: r.entry.unit })}
      </span>
    ) : (
      <span className="italic text-muted">{t("compared.noPrice")}</span>
    );
  const method = (r: (typeof rows)[number]) =>
    r.product.attar_type ? (
      <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-cocoa">{t(`attarType.${r.product.attar_type}`)}</span>
    ) : (
      <span className="text-xs italic text-muted">{t("compared.noClaim")}</span>
    );
  const source = (r: (typeof rows)[number]) =>
    r.entry?.sourceUrl ? (
      <a href={r.entry.sourceUrl} rel="nofollow noopener" target="_blank" className="text-xs">
        {r.entry.sourceName}
      </a>
    ) : (
      nd
    );
  const name = (r: (typeof rows)[number]) => shortName(pick(locale, r.product.name, r.product.name_hi).text ?? r.product.name);

  return (
    <>
      <ol className="space-y-3 md:hidden">
        {rows.map((r, i) => (
          <li key={r.product.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs text-muted">#{i + 1}</span>
                <h3 className="text-lg font-semibold leading-snug">
                  <Link href={`/attars/${r.product.slug}`} className="text-bark">
                    {name(r)}
                  </Link>
                </h3>
                <p className="text-sm text-muted">{r.product.house.name}</p>
              </div>
              <div className="text-right">{per10(r)}</div>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted">{t("best.cheapest")}</dt>
              <dd>{entry(r)}</dd>
              <dt className="text-muted">{t("compared.claim")}</dt>
              <dd>{method(r)}</dd>
              <dt className="text-muted">{t("best.family")}</dt>
              <dd>{r.product.scent_family ?? nd}</dd>
              <dt className="text-muted">{t("compared.source")}</dt>
              <dd>{source(r)}</dd>
            </dl>
          </li>
        ))}
      </ol>

      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white/70 md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-sand/40 text-muted">
            <tr>
              <th scope="col" className="w-10 p-3 font-medium">#</th>
              <th scope="col" className="p-3 font-medium">{t("compared.product")}</th>
              <th scope="col" className="p-3 font-medium">{t("compared.per10")}</th>
              <th scope="col" className="p-3 font-medium">{t("best.cheapest")}</th>
              <th scope="col" className="p-3 font-medium">{t("compared.claim")}</th>
              <th scope="col" className="p-3 font-medium">{t("best.family")}</th>
              <th scope="col" className="p-3 font-medium">{t("compared.source")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.product.id} className="border-b border-line/60 align-top last:border-0">
                <td className="p-3 tabular-nums text-muted">{i + 1}</td>
                <th scope="row" className="p-3 font-normal">
                  <Link href={`/attars/${r.product.slug}`} className="font-display text-base font-semibold text-bark">
                    {name(r)}
                  </Link>
                  <Link href={`/houses/${r.product.house.slug}`} className="block text-xs text-muted no-underline hover:underline">
                    {r.product.house.name}
                  </Link>
                </th>
                <td className="p-3">{per10(r)}</td>
                <td className="p-3">{entry(r)}</td>
                <td className="p-3">{method(r)}</td>
                <td className="p-3">{r.product.scent_family ?? nd}</td>
                <td className="p-3">{source(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
