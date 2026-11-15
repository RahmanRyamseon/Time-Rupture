import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStyleComparison } from "@/lib/data/wiki";
import { buildFootnotes } from "@/lib/citations";
import { byPer10, lowestPer10 } from "@/lib/compare";
import { formatDate, formatInr, pick } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/metadata";
import { absoluteUrl } from "@/lib/site";
import { Markdown } from "@/components/wiki/Markdown";
import { Cite } from "@/components/wiki/Cite";
import { References } from "@/components/wiki/References";
import { JsonLd } from "@/components/wiki/JsonLd";

export const revalidate = 600;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ locale: string; slug: string }> };

async function load(slug: string) {
  const data = await getStyleComparison(slug);
  if (!data || data.versions.length < 2) return null;
  const rows = data.versions
    .map((v) => ({
      ...v,
      name: v.attar.name,
      per10: lowestPer10(v.prices),
      // Drop the trailing "(House)" from the name because the house is shown underneath.
      shortName: v.house ? v.attar.name.replace(/\s*\([^()]*\)$/, "") : v.attar.name,
    }))
    .sort(byPer10);
  const houses = new Set(rows.map((r) => r.house?.slug ?? r.attar.slug)).size;
  const checked = rows.flatMap((r) => r.prices.map((p) => p.reported_on)).sort().at(-1) ?? null;
  return { ...data, rows, houses, checked };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await load(slug);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "compared" });
  const style = pick(locale, data.style.attar.name, data.style.attar.name_hi).text ?? data.style.attar.name;
  return pageMetadata(
    `/compared/${slug}`,
    locale,
    t("metaTitle", { style, count: data.rows.length }),
    t("metaDescription", { style, count: data.rows.length, houses: data.houses }),
  );
}

export default async function StyleComparisonPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await load(slug);
  if (!data) notFound();
  const t = await getTranslations();
  const { style, rows } = data;
  const styleName = pick(locale, style.attar.name, style.attar.name_hi).text ?? style.attar.name;
  const footnotes = buildFootnotes(style.citations, ["description", "how_made", "notes"]);
  const nd = <span className="italic text-muted">—</span>;
  const units = new Set(rows.flatMap((r) => r.prices.map((p) => p.unit ?? "ml")));

  const priceList = (r: (typeof rows)[number]) => {
    const latest = r.per10?.reportedOn;
    const ps = r.prices.filter((p) => p.reported_on === latest).sort((a, b) => Number(a.volume_ml) - Number(b.volume_ml));
    return ps.length ? (
      <ul className="space-y-0.5">
        {ps.map((p) => (
          <li key={p.id} className="whitespace-nowrap tabular-nums">
            {t("attar.priceRowSingle", { min: formatInr(Number(p.price_min_inr), locale), volume: Number(p.volume_ml), unit: p.unit ?? "ml" })}
          </li>
        ))}
      </ul>
    ) : (
      <span className="italic text-muted">{t("compared.noPrice")}</span>
    );
  };
  const per10 = (r: (typeof rows)[number]) =>
    r.per10 ? (
      <span className="whitespace-nowrap font-semibold tabular-nums text-bark">
        ₹{formatInr(r.per10.value, locale)} <span className="text-xs font-normal text-muted">/ 10 {r.per10.unit}</span>
      </span>
    ) : (
      nd
    );
  const claim = (r: (typeof rows)[number]) =>
    r.attar.attar_type ? (
      <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-cocoa">{t(`attarType.${r.attar.attar_type}`)}</span>
    ) : (
      <span className="text-xs italic text-muted">{t("compared.noClaim")}</span>
    );
  const notes = (r: (typeof rows)[number]) =>
    r.notes.length ? r.notes.map((n) => pick(locale, n.note.name, n.note.name_hi).text).join(", ") : nd;
  const sourceUrl = (r: (typeof rows)[number]) => r.prices[0]?.source_url ?? r.citations.find((c) => c.field_name === "description")?.url ?? null;
  const sourceName = (r: (typeof rows)[number]) =>
    r.prices[0]?.source_name ?? r.citations.find((c) => c.field_name === "description")?.publisher ?? r.house?.name ?? "";
  const source = (r: (typeof rows)[number]) => {
    const url = sourceUrl(r);
    return url ? (
      <a href={url} rel="nofollow noopener" target="_blank" className="text-xs">
        {sourceName(r)}
      </a>
    ) : (
      nd
    );
  };

  return (
    <div className="container-wiki py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t("compared.title", { style: styleName }),
          url: absoluteUrl(`/compared/${slug}`, locale),
          numberOfItems: rows.length,
          itemListElement: rows.map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: r.attar.name,
            url: absoluteUrl(`/attars/${r.attar.slug}`, locale),
          })),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/compared">{t("compared.indexTitle")}</Link> <span aria-hidden="true">/</span> {styleName}
      </nav>
      <p className="eyebrow mt-4 text-amber">{t("compared.eyebrow")}</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">{t("compared.title", { style: styleName })}</h1>
      <p className="reading mt-4 text-lg text-ink/85">{t("compared.lede", { count: rows.length, houses: data.houses })}</p>
      {data.checked ? <p className="mt-1 text-sm text-muted">{t("compared.checked", { date: formatDate(data.checked, locale) })}</p> : null}

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        {units.size > 1 ? (
          <p className="rounded-xl border border-gold/50 bg-gold/10 p-3 text-ink/90">{t("compared.unitWarning")}</p>
        ) : null}
        <p className="rounded-xl border border-line bg-sand/50 p-3 text-ink/90">{t("compared.claimWarning")}</p>
      </div>

      <section aria-labelledby="table-h" className="mt-10">
        <h2 id="table-h" className="sr-only">
          {t("compared.table")}
        </h2>

        {/* Mobile: one card per version */}
        <ol className="space-y-3 md:hidden">
          {rows.map((r, i) => (
            <li key={r.attar.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs text-muted">#{i + 1}</span>
                  <h3 className="text-lg font-semibold leading-snug">
                    <Link href={`/attars/${r.attar.slug}`} className="text-bark">
                      {r.shortName}
                    </Link>
                  </h3>
                  {r.house ? <p className="text-sm text-muted">{r.house.name}</p> : null}
                </div>
                <div className="text-right">{per10(r)}</div>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted">{t("compared.listed")}</dt>
                <dd>{priceList(r)}</dd>
                <dt className="text-muted">{t("compared.claim")}</dt>
                <dd>{claim(r)}</dd>
                <dt className="text-muted">{t("compared.base")}</dt>
                <dd>{r.attar.base_oil ?? nd}</dd>
                <dt className="text-muted">{t("compared.notes")}</dt>
                <dd>{notes(r)}</dd>
                <dt className="text-muted">{t("compared.source")}</dt>
                <dd>{source(r)}</dd>
              </dl>
            </li>
          ))}
        </ol>

        {/* Desktop: one table */}
        <div className="hidden overflow-x-auto rounded-xl border border-line bg-white/70 md:block">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">{t("compared.title", { style: styleName })}</caption>
            <thead className="border-b border-line bg-sand/40 text-muted">
              <tr>
                <th scope="col" className="p-3 font-medium">{t("compared.product")}</th>
                <th scope="col" className="p-3 font-medium">{t("compared.per10")}</th>
                <th scope="col" className="p-3 font-medium">{t("compared.listed")}</th>
                <th scope="col" className="p-3 font-medium">{t("compared.claim")}</th>
                <th scope="col" className="p-3 font-medium">{t("compared.base")}</th>
                <th scope="col" className="p-3 font-medium">{t("compared.notes")}</th>
                <th scope="col" className="p-3 font-medium">{t("compared.source")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.attar.id} className="border-b border-line/60 align-top last:border-0">
                  <th scope="row" className="p-3 font-normal">
                    <Link href={`/attars/${r.attar.slug}`} className="font-display text-base font-semibold text-bark">
                      {r.shortName}
                    </Link>
                    {r.house ? (
                      <Link href={`/houses/${r.house.slug}`} className="block text-xs text-muted no-underline hover:underline">
                        {r.house.name}
                      </Link>
                    ) : null}
                  </th>
                  <td className="p-3">{per10(r)}</td>
                  <td className="p-3">{priceList(r)}</td>
                  <td className="p-3">{claim(r)}</td>
                  <td className="p-3">{r.attar.base_oil ?? nd}</td>
                  <td className="p-3">{notes(r)}</td>
                  <td className="p-3">{source(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          <Link href={{ pathname: "/compare", query: { items: rows.slice(0, 4).map((r) => r.attar.slug).join(",") } }}>
            {t("compared.sideBySide")}
          </Link>
        </p>
      </section>

      {style.attar.description ? (
        <section aria-labelledby="buyers-h" className="reading mt-12">
          <h2 id="buyers-h" className="mb-3 text-2xl font-semibold">
            {t("compared.buyers")}
          </h2>
          <Markdown>{style.attar.description}</Markdown>
          <Cite field="description" footnotes={footnotes} missing={[]} />
          <p className="mt-4">
            <Link href={`/attars/${slug}`} className="font-semibold">
              {t("compared.styleLink", { style: styleName })}
            </Link>
          </p>
        </section>
      ) : null}

      <aside className="card reading mt-10 p-5">
        <h2 className="text-lg font-semibold">{t("compared.missing")}</h2>
        <p className="mt-1 text-sm text-muted">{t("compared.missingBody")}</p>
        <Link href="/contribute" className="btn-secondary mt-3 inline-flex">
          {t("nav.contribute")}
        </Link>
      </aside>

      <div className="reading mt-10">
        <References footnotes={footnotes} />
      </div>
    </div>
  );
}
