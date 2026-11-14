import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAttar, getPublishedReviews } from "@/lib/data/wiki";
import { buildFootnotes } from "@/lib/citations";
import { formatDate, formatInr, pick } from "@/lib/i18n-content";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { SECTION_DEFS } from "@/lib/sections";
import { WikiShell, WikiSection } from "@/components/wiki/WikiShell";
import { Cite } from "@/components/wiki/Cite";
import { NotDocumented } from "@/components/wiki/NotDocumented";
import { Markdown } from "@/components/wiki/Markdown";
import { References } from "@/components/wiki/References";
import { MediaFigure } from "@/components/wiki/MediaFigure";
import { JsonLd } from "@/components/wiki/JsonLd";
import { NotesPyramid } from "@/components/attar/NotesPyramid";
import { VoteStats } from "@/components/attar/VoteStats";
import { VotePanel } from "@/components/attar/VotePanel";
import { Reviews } from "@/components/attar/Reviews";
import { ShelfButton } from "@/components/attar/ShelfButton";
import { CompareButton } from "@/components/attar/CompareButton";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 600;

export function generateStaticParams() {
  return []; // rendered on first request, then cached (ISR)
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getAttar(slug);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "attar" });
  const name = pick(locale, data.attar.name, data.attar.name_hi).text ?? data.attar.name;
  const summary = pick(locale, data.attar.summary, data.attar.summary_hi).text;
  const title = data.house ? `${name} ${t("madeBy", { house: data.house.name })}` : name;
  return {
    title,
    description: summary ?? undefined,
    alternates: {
      canonical: absoluteUrl(`/attars/${slug}`, locale),
      languages: { "en-IN": absoluteUrl(`/attars/${slug}`, "en"), "hi-IN": absoluteUrl(`/attars/${slug}`, "hi") },
    },
    openGraph: { title, description: summary ?? undefined, type: "article", url: absoluteUrl(`/attars/${slug}`, locale) },
    robots: data.attar.published ? undefined : { index: false },
  };
}

export default async function AttarPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await getAttar(slug);
  if (!data || !data.attar.published) notFound();
  const t = await getTranslations();
  const reviews = await getPublishedReviews(data.attar.id);

  const { attar, house, region } = data;
  const name = pick(locale, attar.name, attar.name_hi);
  const summary = pick(locale, attar.summary, attar.summary_hi);
  const fieldOrder = [...SECTION_DEFS.attars.fields.map((f) => f.name), "notes"];
  const footnotes = buildFootnotes(data.citations, fieldOrder);
  const missing = data.missingCitations;
  const editHref = `/attars/${slug}/edit`;
  const latestPrice = data.prices[0];

  const toc = [
    { id: "overview", text: t("attar.overview") },
    { id: "notes", text: t("attar.pyramid") },
    { id: "how-made", text: t("field.how_made") },
    { id: "performance", text: t("attar.performance") },
    { id: "prices", text: t("attar.prices") },
    { id: "related", text: t("attar.related") },
    { id: "reviews", text: t("attar.reviews") },
    ...(footnotes.list.length ? [{ id: "references", text: t("wiki.references") }] : []),
  ];

  const facts: { field: string; label: string; value: React.ReactNode }[] = [
    {
      field: "house_id",
      label: t("field.house_id"),
      value: house ? <Link href={`/houses/${house.slug}`}>{pick(locale, house.name, house.name_hi).text}</Link> : null,
    },
    { field: "attar_type", label: t("field.attar_type"), value: attar.attar_type ? t(`attarType.${attar.attar_type}`) : null },
    { field: "base_oil", label: t("field.base_oil"), value: attar.base_oil },
    {
      field: "scent_family",
      label: t("field.scent_family"),
      value: attar.scent_family ? (
        <Link href={{ pathname: "/attars", query: { family: attar.scent_family } }}>{attar.scent_family}</Link>
      ) : null,
    },
    {
      field: "region_id",
      label: t("field.region_id"),
      value: region ? <Link href={`/regions/${region.slug}`}>{pick(locale, region.name, region.name_hi).text}</Link> : null,
    },
    { field: "launch_year", label: t("field.launch_year"), value: attar.launch_year },
    {
      field: "occasions",
      label: t("field.occasions"),
      value: attar.occasions.length ? attar.occasions.join(", ") : null,
    },
    { field: "aliases", label: t("field.aliases"), value: attar.aliases.length ? attar.aliases.join(", ") : null },
  ];

  const relationGroups = (["similar", "clone_of", "inspired_by"] as const).map((rel) => ({
    rel,
    items: data.relations.filter((r) => r.relation === rel),
    reverse: data.reverseRelations.filter((r) => r.relation === rel),
  }));
  const hasRelations = relationGroups.some((g) => g.items.length || g.reverse.length);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: attar.name,
    alternateName: [attar.name_hi, ...attar.aliases].filter(Boolean),
    description: attar.summary ?? undefined,
    category: "Attar / perfume oil",
    url: absoluteUrl(`/attars/${slug}`, locale),
    brand: house ? { "@type": "Brand", name: house.name, url: house.website_url ?? undefined } : undefined,
    additionalProperty: [
      attar.attar_type && { "@type": "PropertyValue", name: "Type", value: t(`attarType.${attar.attar_type}`) },
      attar.base_oil && { "@type": "PropertyValue", name: "Base oil", value: attar.base_oil },
      attar.scent_family && { "@type": "PropertyValue", name: "Scent family", value: attar.scent_family },
      ...data.notes.map((n) => ({ "@type": "PropertyValue", name: `${n.position} note`, value: n.note.name })),
    ].filter(Boolean),
    subjectOf: {
      "@type": "Article",
      headline: attar.name,
      dateModified: attar.updated_at,
      publisher: { "@type": "Organization", name: SITE_NAME },
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <WikiShell
        section="attars"
        type="attar"
        id={attar.id}
        slug={slug}
        title={name.text ?? attar.name}
        eyebrow={t("types.attar")}
        subtitle={
          house
            ? t.rich("attar.madeByLink", {
                house: pick(locale, house.name, house.name_hi).text ?? house.name,
                link: (chunks) => <Link href={`/houses/${house.slug}`}>{chunks}</Link>,
              })
            : undefined
        }
        updatedAt={attar.updated_at}
        revisionCount={data.revisionCount}
        toc={toc}
        englishOnly={name.isFallback}
        aside={
          <>
            <MediaFigure media={data.media[0]} type="attar" alt={attar.name} />
            <div className="card p-4">
              <h2 className="eyebrow mb-3 font-sans">{t("attar.facts")}</h2>
              <dl className="space-y-2 text-sm">
                {facts.map((f) => (
                  <div key={f.field} className="grid grid-cols-[7.5rem_1fr] gap-2">
                    <dt className="text-muted">{f.label}</dt>
                    <dd className="text-ink">
                      {f.value ?? <NotDocumented inline editHref={editHref} />}
                      {f.value ? <Cite field={f.field} footnotes={footnotes} missing={missing} /> : null}
                    </dd>
                  </div>
                ))}
                {house?.website_url ? (
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2">
                    <dt className="text-muted">{t("wiki.officialWebsite")}</dt>
                    <dd>
                      <a href={house.website_url} rel="noopener" target="_blank" className="inline-flex items-center gap-1 break-all">
                        {new URL(house.website_url).hostname}
                        <Icon name="external" className="h-3.5 w-3.5" />
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <div className="card space-y-3 p-4">
              <ShelfButton attarId={attar.id} slug={slug} name={attar.name} />
              <CompareButton slug={slug} name={attar.name} />
            </div>
          </>
        }
      >
        <WikiSection id="overview" title={t("attar.overview")}>
          {summary.text ? <p className="text-lg leading-relaxed text-ink/90">{summary.text}</p> : null}
          {attar.description ? (
            <div className="mt-4">
              <Markdown>{attar.description}</Markdown>
              <Cite field="description" footnotes={footnotes} missing={missing} />
            </div>
          ) : !summary.text ? (
            <NotDocumented editHref={editHref} />
          ) : null}
        </WikiSection>

        <WikiSection id="notes" title={t("attar.pyramid")}>
          {data.notes.length ? (
            <>
              <NotesPyramid notes={data.notes} />
              <p className="mt-2 text-right">
                <Cite field="notes" footnotes={footnotes} missing={missing} />
              </p>
            </>
          ) : (
            <NotDocumented editHref={editHref} />
          )}
        </WikiSection>

        <WikiSection id="how-made" title={t("field.how_made")}>
          {attar.how_made ? (
            <>
              <Markdown>{attar.how_made}</Markdown>
              <Cite field="how_made" footnotes={footnotes} missing={missing} />
            </>
          ) : (
            <NotDocumented editHref={editHref} />
          )}
        </WikiSection>

        <WikiSection id="performance" title={t("attar.performance")}>
          <p className="mb-4 text-sm text-muted">{t("attar.performanceHelp")}</p>
          <VoteStats stats={data.stats} metrics={["heat", "humidity", "winter", "longevity", "sillage"]} />
          <VotePanel attarId={attar.id} />
        </WikiSection>

        <WikiSection id="prices" title={t("attar.prices")}>
          <p className="mb-4 text-sm text-muted">{t("attar.priceHelp")}</p>
          {data.prices.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <caption className="sr-only">{t("attar.prices")}</caption>
                <thead className="border-b border-line text-muted">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("field.price")}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">₹ / 10 ml</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{t("edit.reportedOn")}</th>
                    <th scope="col" className="py-2 font-medium">{t("attar.source")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.prices.map((p) => (
                    <tr key={p.id} className={`border-b border-line/60 ${p === latestPrice ? "font-medium" : "text-ink/80"}`}>
                      <td className="py-2 pr-3">
                        {t("attar.priceRow", {
                          min: formatInr(Number(p.price_min_inr), locale),
                          max: formatInr(Number(p.price_max_inr), locale),
                          volume: Number(p.volume_ml),
                        })}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {formatInr((Number(p.price_min_inr) / Number(p.volume_ml)) * 10, locale)}–
                        {formatInr((Number(p.price_max_inr) / Number(p.volume_ml)) * 10, locale)}
                      </td>
                      <td className="py-2 pr-3">{formatDate(p.reported_on, locale)}</td>
                      <td className="py-2">
                        {p.source_url ? (
                          <a href={p.source_url} rel="nofollow noopener" target="_blank">
                            {p.source_name}
                          </a>
                        ) : (
                          p.source_name
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NotDocumented editHref={editHref} />
          )}
        </WikiSection>

        <WikiSection id="related" title={t("attar.related")}>
          {hasRelations ? (
            <div className="space-y-4">
              {relationGroups.map((g) =>
                g.items.length || g.reverse.length ? (
                  <div key={g.rel}>
                    {g.items.length ? (
                      <>
                        <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-muted">{t(`relation.${g.rel}`)}</h3>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {g.items.map((r) => (
                            <li key={r.id}>
                              {r.related ? (
                                <Link href={`/attars/${r.related.slug}`} className="chip">
                                  {pick(locale, r.related.name, r.related.name_hi).text}
                                </Link>
                              ) : (
                                <span className="chip border-dashed" title={r.note ?? undefined}>
                                  {r.external_name}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {g.reverse.length ? (
                      <>
                        <h3 className="mt-3 font-sans text-sm font-semibold uppercase tracking-wider text-muted">
                          {t(g.rel === "similar" ? "relation.reverseSimilar" : g.rel === "clone_of" ? "relation.reverseClone" : "relation.reverseInspired")}
                        </h3>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {g.reverse.map((r) => (
                            <li key={r.id}>
                              <Link href={`/attars/${r.related!.slug}`} className="chip">
                                {pick(locale, r.related!.name, r.related!.name_hi).text}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            <NotDocumented editHref={editHref} />
          )}
        </WikiSection>

        <WikiSection id="reviews" title={t("attar.reviews")}>
          <Reviews attarId={attar.id} reviews={reviews} />
        </WikiSection>

        <div className="reading">
          <References footnotes={footnotes} />
        </div>
      </WikiShell>
    </>
  );
}
