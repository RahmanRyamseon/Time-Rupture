import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getHouse } from "@/lib/data/wiki";
import { buildFootnotes } from "@/lib/citations";
import { pick } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/metadata";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { SECTION_DEFS } from "@/lib/sections";
import { WikiShell, WikiSection } from "@/components/wiki/WikiShell";
import { FieldBlock } from "@/components/wiki/FieldBlock";
import { Cite } from "@/components/wiki/Cite";
import { NotDocumented } from "@/components/wiki/NotDocumented";
import { References } from "@/components/wiki/References";
import { MediaFigure } from "@/components/wiki/MediaFigure";
import { JsonLd } from "@/components/wiki/JsonLd";
import { AttarCards } from "@/components/attar/AttarCards";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 600;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = await getHouse(slug);
  if (!d) return {};
  return pageMetadata(`/houses/${slug}`, locale, pick(locale, d.house.name, d.house.name_hi).text ?? d.house.name,
    pick(locale, d.house.summary, d.house.summary_hi).text);
}

export default async function HousePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = await getHouse(slug);
  if (!d || !d.house.published) notFound();
  const t = await getTranslations();
  const { house } = d;
  const footnotes = buildFootnotes(d.citations, SECTION_DEFS.houses.fields.map((f) => f.name));
  const editHref = `/houses/${slug}/edit`;
  const name = pick(locale, house.name, house.name_hi);
  const summary = pick(locale, house.summary, house.summary_hi);

  const facts = [
    { field: "city", label: t("field.city"), value: house.city },
    {
      field: "region_id",
      label: t("field.region_id"),
      value: d.region ? <Link href={`/regions/${d.region.slug}`}>{pick(locale, d.region.name, d.region.name_hi).text}</Link> : null,
    },
    { field: "founded_year", label: t("field.founded_year"), value: house.founded_year },
    {
      field: "website_url",
      label: t("wiki.officialWebsite"),
      value: house.website_url ? (
        <a href={house.website_url} rel="noopener" target="_blank" className="inline-flex items-center gap-1 break-all">
          {new URL(house.website_url).hostname}
          <Icon name="external" className="h-3.5 w-3.5" />
        </a>
      ) : null,
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: house.name,
          about: {
            "@type": "Organization",
            name: house.name,
            alternateName: [house.name_hi, ...house.aliases].filter(Boolean),
            foundingDate: house.founded_year ? String(house.founded_year) : undefined,
            url: house.website_url ?? undefined,
            address: house.city ? { "@type": "PostalAddress", addressLocality: house.city, addressCountry: "IN" } : undefined,
          },
          dateModified: house.updated_at,
          url: absoluteUrl(`/houses/${slug}`, locale),
          publisher: { "@type": "Organization", name: SITE_NAME },
        }}
      />
      <WikiShell
        section="houses"
        type="house"
        id={house.id}
        slug={slug}
        title={name.text ?? house.name}
        eyebrow={t("types.house")}
        subtitle={house.city ?? undefined}
        updatedAt={house.updated_at}
        revisionCount={d.revisionCount}
        englishOnly={name.isFallback}
        toc={[
          { id: "overview", text: t("attar.overview") },
          { id: "history", text: t("field.history") },
          { id: "attars", text: t("sections.attars") },
          ...(footnotes.list.length ? [{ id: "references", text: t("wiki.references") }] : []),
        ]}
        aside={
          <>
            <MediaFigure media={d.media[0]} type="house" alt={house.name} />
            <div className="card p-4">
              <h2 className="eyebrow mb-3 font-sans">{t("attar.facts")}</h2>
              <dl className="space-y-2 text-sm">
                {facts.map((f) => (
                  <div key={f.field} className="grid grid-cols-[7.5rem_1fr] gap-2">
                    <dt className="text-muted">{f.label}</dt>
                    <dd>
                      {f.value ?? <NotDocumented inline editHref={editHref} />}
                      {f.value ? <Cite field={f.field} footnotes={footnotes} missing={d.missingCitations} /> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        }
      >
        <WikiSection id="overview" title={t("attar.overview")}>
          {summary.text ? <p className="text-lg leading-relaxed">{summary.text}</p> : <NotDocumented editHref={editHref} />}
        </WikiSection>
        <WikiSection id="history" title={t("field.history")}>
          <FieldBlock value={house.history} field="history" footnotes={footnotes} missing={d.missingCitations} editHref={editHref} />
        </WikiSection>
        <section id="attars" className="mb-10 scroll-mt-24">
          <h2 className="mb-4 text-2xl font-semibold">{t("sections.attars")}</h2>
          {d.attars.length ? <AttarCards attars={d.attars} /> : <NotDocumented editHref="/new/attars" />}
        </section>
        <div className="reading">
          <References footnotes={footnotes} />
        </div>
      </WikiShell>
    </>
  );
}
