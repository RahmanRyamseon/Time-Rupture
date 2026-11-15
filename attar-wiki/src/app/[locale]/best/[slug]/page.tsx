import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProductRows } from "@/lib/data/wiki";
import { BUDGETS, budgetFromSlug, budgetSlug, entryPrice } from "@/lib/compare";
import { formatDate } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import { ProductTable, rankRows } from "@/components/compare/ProductTable";
import { JsonLd } from "@/components/wiki/JsonLd";

export const revalidate = 600;

export function generateStaticParams() {
  return BUDGETS.map((b) => ({ slug: budgetSlug(b) }));
}

type Props = { params: Promise<{ locale: string; slug: string }> };

async function load(slug: string) {
  const max = budgetFromSlug(slug);
  if (!max) return null;
  const products = (await getProductRows()).filter((p) => {
    const e = entryPrice(p.prices);
    return e !== null && e.price <= max;
  });
  const houses = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of products) {
    const h = houses.get(p.house.slug) ?? { ...p.house, count: 0 };
    h.count++;
    houses.set(p.house.slug, h);
  }
  const checked = products.flatMap((p) => p.prices.map((x) => x.reported_on)).sort().at(-1) ?? null;
  return { max, products, houses: [...houses.values()].sort((a, b) => b.count - a.count), checked };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await load(slug);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "best" });
  const v = { max: data.max, count: data.products.length, houses: data.houses.length };
  return pageMetadata(`/best/${slug}`, locale, t("metaTitle", v), t("metaDescription", v), data.products.length ? {} : { robots: { index: false } });
}

export default async function BudgetPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await load(slug);
  if (!data) notFound();
  const t = await getTranslations();
  const title = t("best.title", { max: data.max });
  const ranked = rankRows(data.products);

  return (
    <div className="container-wiki py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: title,
          url: absoluteUrl(`/best/${slug}`, locale),
          numberOfItems: ranked.length,
          itemListElement: ranked.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.product.name, url: absoluteUrl(`/attars/${r.product.slug}`, locale) })),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/compared">{t("compared.indexTitle")}</Link> <span aria-hidden="true">/</span> {t("best.under", { max: data.max })}
      </nav>
      <p className="eyebrow mt-4 text-amber">{t("best.eyebrow")}</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
      <p className="reading mt-4 text-lg text-ink/85">{t("best.lede", { count: data.products.length, houses: data.houses.length, max: data.max })}</p>
      {data.checked ? <p className="mt-1 text-sm text-muted">{t("compared.checked", { date: formatDate(data.checked, locale) })}</p> : null}

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <p className="rounded-xl border border-gold/50 bg-gold/10 p-3 text-ink/90">{t("best.notBest")}</p>
        <p className="rounded-xl border border-line bg-sand/50 p-3 text-ink/90">
          {t("best.rules")} {t("compared.unitWarning")}
        </p>
      </div>

      {data.houses.length ? (
        <p className="mt-6 text-sm">
          <span className="font-semibold">{t("best.byHouse")}:</span>{" "}
          {data.houses.map((h, i) => (
            <span key={h.slug}>
              {i ? " · " : ""}
              <Link href={`/houses/${h.slug}`}>{h.name}</Link> ({h.count})
            </span>
          ))}
        </p>
      ) : null}

      <section className="mt-6" aria-label={title}>
        {data.products.length ? (
          <ProductTable products={data.products} locale={locale} caption={title} />
        ) : (
          <p className="rounded-xl border border-dashed border-line bg-sand/50 p-6 text-muted">{t("best.empty")}</p>
        )}
      </section>

      <nav aria-labelledby="other-budgets" className="mt-10">
        <h2 id="other-budgets" className="text-xl font-semibold">
          {t("best.otherBudgets")}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {BUDGETS.filter((b) => b !== data.max).map((b) => (
            <li key={b}>
              <Link href={`/best/${budgetSlug(b)}`} className="chip min-h-10 px-4">
                {t("best.under", { max: b })}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/compared" className="chip min-h-10 px-4">
              {t("compared.indexTitle")}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
