import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAttarCards, getHouse, getProductRows } from "@/lib/data/wiki";
import { brandPairs, sharedStyles, type HouseSummary } from "@/lib/brands";
import { lowestPer10 } from "@/lib/compare";
import { formatDate, formatInr, pick } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/metadata";
import { ProductTable, rankRows, shortName } from "@/components/compare/ProductTable";

export const revalidate = 600;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ locale: string; pair: string }> };

async function load(pair: string) {
  const rows = await getProductRows();
  const found = brandPairs(rows).find((p) => p.slug === pair);
  if (!found) return null;
  const checked = [...found.a.products, ...found.b.products].flatMap((p) => p.prices.map((x) => x.reported_on)).sort().at(-1) ?? null;
  return { ...found, checked, shared: sharedStyles(found.a, found.b) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, pair } = await params;
  const data = await load(pair);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "brands" });
  const v = { a: data.a.name, b: data.b.name };
  return pageMetadata(`/compared/brands/${pair}`, locale, t("metaTitle", v), t("metaDescription", v));
}

export default async function BrandPairPage({ params }: Props) {
  const { locale, pair } = await params;
  setRequestLocale(locale);
  const data = await load(pair);
  if (!data) notFound();
  const t = await getTranslations();
  const { a, b } = data;
  const [houseA, houseB] = await Promise.all([getHouse(a.slug), getHouse(b.slug)]);
  const styleCards = await getAttarCards(data.shared.map((s) => s.style));
  const styleName = (slug: string) => {
    const c = styleCards.find((x) => x.slug === slug);
    return c ? (pick(locale, c.name, c.name_hi).text ?? c.name) : slug;
  };
  const nd = <span className="italic text-muted">—</span>;
  const title = t("brands.title", { a: a.name, b: b.name });

  const range = (h: HouseSummary) =>
    h.entryMin != null ? `₹${formatInr(h.entryMin, locale)} – ₹${formatInr(h.entryMax!, locale)}` : "—";
  const medianRows = (["ml", "g"] as const).filter((u) => a.medianPer10[u] != null || b.medianPer10[u] != null);
  const site = (h: Awaited<ReturnType<typeof getHouse>>) =>
    h?.house.website_url ? (
      <a href={h.house.website_url} rel="nofollow noopener" target="_blank">
        {h.house.website_url.replace(/^https?:\/\//, "")}
      </a>
    ) : (
      nd
    );
  const version = (p: HouseSummary["products"][number]) => {
    const per10 = lowestPer10(p.prices);
    return (
      <li key={p.id}>
        <Link href={`/attars/${p.slug}`}>{shortName(p.name)}</Link>
        {per10 ? (
          <span className="ml-1 whitespace-nowrap text-xs text-muted">
            ₹{formatInr(per10.value, locale)} / 10 {per10.unit}
          </span>
        ) : null}
      </li>
    );
  };

  return (
    <div className="container-wiki py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/compared">{t("compared.indexTitle")}</Link> <span aria-hidden="true">/</span> {t("brands.index")}
      </nav>
      <p className="eyebrow mt-4 text-amber">{t("brands.eyebrow")}</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
      {data.checked ? <p className="reading mt-4 text-lg text-ink/85">{t("brands.lede", { date: formatDate(data.checked, locale) })}</p> : null}
      <p className="reading mt-3 rounded-xl border border-line bg-sand/50 p-3 text-sm text-ink/90">{t("best.notBest")}</p>

      <section aria-labelledby="glance" className="mt-10">
        <h2 id="glance" className="mb-4 text-2xl font-semibold">
          {t("brands.atGlance")}
        </h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="border-b border-line bg-sand/40">
              <tr>
                <th scope="col" className="w-1/3 p-3" />
                {[a, b].map((h) => (
                  <th key={h.slug} scope="col" className="p-3 font-display text-lg font-semibold text-bark">
                    <Link href={`/houses/${h.slug}`} className="text-bark">
                      {h.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line/60">
                <th scope="row" className="p-3 font-medium text-muted">{t("brands.priced")}</th>
                <td className="p-3 tabular-nums">{a.priced}</td>
                <td className="p-3 tabular-nums">{b.priced}</td>
              </tr>
              <tr className="border-b border-line/60">
                <th scope="row" className="p-3 font-medium text-muted">{t("brands.entryRange")}</th>
                <td className="p-3 tabular-nums">{range(a)}</td>
                <td className="p-3 tabular-nums">{range(b)}</td>
              </tr>
              {medianRows.map((u) => (
                <tr key={u} className="border-b border-line/60">
                  <th scope="row" className="p-3 font-medium text-muted">{t("brands.medianPer10", { unit: u })}</th>
                  {[a, b].map((h) => (
                    <td key={h.slug} className="p-3 font-semibold tabular-nums text-bark">
                      {h.medianPer10[u] != null ? `₹${formatInr(h.medianPer10[u]!, locale)}` : nd}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-line/60">
                <th scope="row" className="p-3 font-medium text-muted">{t("brands.methodStated")}</th>
                <td className="p-3 tabular-nums">{Math.round(a.methodStated * 100)}%</td>
                <td className="p-3 tabular-nums">{Math.round(b.methodStated * 100)}%</td>
              </tr>
              <tr>
                <th scope="row" className="p-3 font-medium text-muted">{t("brands.website")}</th>
                <td className="p-3 text-xs">{site(houseA)}</td>
                <td className="p-3 text-xs">{site(houseB)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="same" className="mt-12">
        <h2 id="same" className="text-2xl font-semibold">
          {t("brands.same")}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">{t("brands.sameHelp")}</p>
        {data.shared.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.shared.map((s) => (
              <li key={s.style} className="card p-4">
                <h3 className="text-lg font-semibold">
                  <Link href={`/compared/${s.style}`} className="text-bark">
                    {styleName(s.style)}
                  </Link>
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  {[
                    [a, s.a],
                    [b, s.b],
                  ].map(([h, list]) => (
                    <div key={(h as HouseSummary).slug}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{(h as HouseSummary).name}</p>
                      <ul className="mt-1 space-y-1">{(list as HouseSummary["products"]).map(version)}</ul>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t("brands.noSame")}</p>
        )}
      </section>

      {[a, b].map((h) => {
        const five = rankRows(h.products)
          .filter((r) => r.per10)
          .slice(0, 5)
          .map((r) => r.product);
        return five.length ? (
          <section key={h.slug} aria-labelledby={`five-${h.slug}`} className="mt-12">
            <h2 id={`five-${h.slug}`} className="mb-4 text-2xl font-semibold">
              {t("brands.cheapestFive", { house: h.name })}
            </h2>
            <ProductTable products={five} locale={locale} caption={t("brands.cheapestFive", { house: h.name })} />
          </section>
        ) : null;
      })}
    </div>
  );
}
