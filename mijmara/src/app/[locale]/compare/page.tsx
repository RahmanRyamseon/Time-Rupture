import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent, taxName } from "@/lib/content";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import { formatPrice } from "@/lib/format";
import { getVoteSummaries } from "@/lib/votes";
import type { Locale, NoteRef } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { CompareSync } from "@/components/client/CompareSync";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ p?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "compare" });
  return pageMeta({ locale, title: t("title"), description: t("intro"), paths: { ar: href("ar", "/compare"), en: href("en", "/compare") }, noindex: true });
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { p = "" } = await searchParams;
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "compare" });
  const pt = await getTranslations({ locale, namespace: "product" });
  const cm = await getTranslations({ locale, namespace: "common" });
  const ids = p.split(",").filter(Boolean).slice(0, 4);
  const items = ids.map((id) => c.products.find((x) => x.id === id)).filter(Boolean) as typeof c.products;
  const votes = await getVoteSummaries();
  const sep = locale === "ar" ? "، " : ", ";
  const dash = <span className="text-sand-400">{cm("undocumented").split("—")[0].trim()}</span>;
  const notes = (l: NoteRef[]) => l.map((r) => c.notes.find((n) => n.id === r.note)?.name[locale] + (r.origin ? ` (${taxName(c, "origin_group", r.origin, locale)})` : "")).join(sep);
  const rows: { k: string; v: (x: (typeof items)[number]) => React.ReactNode }[] = [
    { k: pt("house"), v: (x) => c.houses.find((h) => h.id === x.houseId)?.name[locale] },
    { k: pt("category"), v: (x) => taxName(c, "category", x.category, locale) },
    { k: pt("origin"), v: (x) => x.origins.map((o) => taxName(c, "origin_group", o, locale)).join(sep) || dash },
    { k: pt("top"), v: (x) => notes(x.notes.top) || dash },
    { k: pt("heart"), v: (x) => notes(x.notes.heart) || dash },
    { k: pt("base"), v: (x) => notes(x.notes.base) || dash },
    { k: pt("occasions"), v: (x) => x.occasions.map((o) => taxName(c, "occasion", o, locale)).join(sep) || dash },
    { k: pt("seasons"), v: (x) => x.seasons.map((o) => taxName(c, "season", o, locale)).join(sep) || dash },
    { k: pt("strength"), v: (x) => { const s = votes.get(x.id)?.strength; return s ? taxName(c, "strength", String(Math.round(s)), locale) : dash; } },
    { k: pt("longevity"), v: (x) => { const s = votes.get(x.id)?.longevity; return s ? taxName(c, "longevity", String(Math.round(s)), locale) : dash; } },
    { k: pt("sillage"), v: (x) => { const s = votes.get(x.id)?.sillage; return s ? taxName(c, "sillage", String(Math.round(s)), locale) : dash; } },
    { k: pt("prices"), v: (x) => x.prices.length ? x.prices.map((pr) => `${formatPrice(pr.min, pr.max, pr.currency, locale)} · ${pr.sizeText[locale]}`).join(" / ") : dash },
  ];
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <CompareSync ids={items.map((x) => x.id)} clearLabel={t("clear")} />
      {items.length === 0 ? <p className="card p-6 text-sand-300">{t("empty")}</p> : (
        <div className="table-scroll rounded-2xl border border-oud-700">
          <table>
            <caption className="sr-only">{t("title")}</caption>
            <thead>
              <tr>
                <th scope="col" className="w-40">{t("attribute")}</th>
                {items.map((x) => <th key={x.id} scope="col" className="min-w-48"><Link prefetch={false} href={href(locale, "/products/[slug]", { slug: x.slug[locale] })}>{x.name[locale]}</Link></th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => <tr key={r.k}><th scope="row">{r.k}</th>{items.map((x) => <td key={x.id}>{r.v(x)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm text-sand-400">{pt("priceNote")}</p>
    </>
  );
}
