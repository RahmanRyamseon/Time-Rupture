import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRegion } from "@/lib/data/wiki";
import { buildFootnotes } from "@/lib/citations";
import { pick } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/metadata";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { SECTION_DEFS } from "@/lib/sections";
import { WikiShell, WikiSection } from "@/components/wiki/WikiShell";
import { FieldBlock } from "@/components/wiki/FieldBlock";
import { NotDocumented } from "@/components/wiki/NotDocumented";
import { References } from "@/components/wiki/References";
import { MediaFigure } from "@/components/wiki/MediaFigure";
import { JsonLd } from "@/components/wiki/JsonLd";
import { AttarCards } from "@/components/attar/AttarCards";

export const revalidate = 600;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = await getRegion(slug);
  if (!d) return {};
  return pageMetadata(`/regions/${slug}`, locale, pick(locale, d.region.name, d.region.name_hi).text ?? d.region.name,
    pick(locale, d.region.summary, d.region.summary_hi).text);
}

export default async function RegionPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = await getRegion(slug);
  if (!d || !d.region.published) notFound();
  const t = await getTranslations();
  const { region } = d;
  const footnotes = buildFootnotes(d.citations, SECTION_DEFS.regions.fields.map((f) => f.name));
  const editHref = `/regions/${slug}/edit`;
  const name = pick(locale, region.name, region.name_hi);
  const summary = pick(locale, region.summary, region.summary_hi);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: region.name,
          about: {
            "@type": "Place",
            name: region.name,
            alternateName: [region.name_hi, ...region.aliases].filter(Boolean),
            address: { "@type": "PostalAddress", addressRegion: region.state ?? undefined, addressCountry: region.country },
            geo:
              region.latitude != null && region.longitude != null
                ? { "@type": "GeoCoordinates", latitude: region.latitude, longitude: region.longitude }
                : undefined,
          },
          dateModified: region.updated_at,
          url: absoluteUrl(`/regions/${slug}`, locale),
          publisher: { "@type": "Organization", name: SITE_NAME },
        }}
      />
      <WikiShell
        section="regions"
        type="region"
        id={region.id}
        slug={slug}
        title={name.text ?? region.name}
        eyebrow={t("types.region")}
        subtitle={[region.state, region.country].filter(Boolean).join(", ")}
        updatedAt={region.updated_at}
        revisionCount={d.revisionCount}
        englishOnly={name.isFallback}
        toc={[
          { id: "overview", text: t("attar.overview") },
          { id: "history", text: t("field.history") },
          { id: "specialities", text: t("field.specialities") },
          { id: "houses", text: t("sections.houses") },
          { id: "attars", text: t("sections.attars") },
          ...(footnotes.list.length ? [{ id: "references", text: t("wiki.references") }] : []),
        ]}
        aside={<MediaFigure media={d.media[0]} type="region" alt={region.name} />}
      >
        <WikiSection id="overview" title={t("attar.overview")}>
          {summary.text ? <p className="text-lg leading-relaxed">{summary.text}</p> : <NotDocumented editHref={editHref} />}
        </WikiSection>
        <WikiSection id="history" title={t("field.history")}>
          <FieldBlock value={region.history} field="history" footnotes={footnotes} missing={d.missingCitations} editHref={editHref} />
        </WikiSection>
        <WikiSection id="specialities" title={t("field.specialities")}>
          <FieldBlock value={region.specialities} field="specialities" footnotes={footnotes} missing={d.missingCitations} editHref={editHref} />
        </WikiSection>
        <WikiSection id="houses" title={t("sections.houses")}>
          {d.houses.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {d.houses.map((h) => (
                <li key={h.id}>
                  <Link href={`/houses/${h.slug}`} className="card block p-3 no-underline hover:shadow-md">
                    <span className="font-semibold text-bark">{pick(locale, h.name, h.name_hi).text}</span>
                    <span className="block text-sm text-muted">{[h.city, h.founded_year].filter(Boolean).join(" · ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <NotDocumented editHref="/new/houses" />
          )}
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
