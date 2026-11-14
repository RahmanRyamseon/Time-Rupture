import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getNote } from "@/lib/data/wiki";
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

export const revalidate = 600;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = await getNote(slug);
  if (!d) return {};
  return pageMetadata(`/notes/${slug}`, locale, pick(locale, d.note.name, d.note.name_hi).text ?? d.note.name,
    pick(locale, d.note.summary, d.note.summary_hi).text);
}

export default async function NotePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = await getNote(slug);
  if (!d || !d.note.published) notFound();
  const t = await getTranslations();
  const { note } = d;
  const footnotes = buildFootnotes(d.citations, SECTION_DEFS.notes.fields.map((f) => f.name));
  const editHref = `/notes/${slug}/edit`;
  const name = pick(locale, note.name, note.name_hi);
  const summary = pick(locale, note.summary, note.summary_hi);
  const total = d.byPosition.top.length + d.byPosition.heart.length + d.byPosition.base.length;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: note.name,
          about: { "@type": "Thing", name: note.name, alternateName: [note.name_hi, note.botanical_name, ...note.aliases].filter(Boolean) },
          dateModified: note.updated_at,
          url: absoluteUrl(`/notes/${slug}`, locale),
          publisher: { "@type": "Organization", name: SITE_NAME },
        }}
      />
      <WikiShell
        section="notes"
        type="note"
        id={note.id}
        slug={slug}
        title={name.text ?? note.name}
        eyebrow={t("types.note")}
        subtitle={
          note.botanical_name ? (
            <>
              <i>{note.botanical_name}</i>
              <Cite field="botanical_name" footnotes={footnotes} missing={d.missingCitations} />
              {note.aliases.length ? <span> · {note.aliases.join(", ")}</span> : null}
            </>
          ) : note.aliases.length ? (
            note.aliases.join(", ")
          ) : undefined
        }
        updatedAt={note.updated_at}
        revisionCount={d.revisionCount}
        englishOnly={name.isFallback}
        toc={[
          { id: "overview", text: t("attar.overview") },
          { id: "smell", text: t("field.smell") },
          { id: "botany", text: t("field.botany") },
          { id: "grown", text: t("field.grown_in") },
          { id: "attars", text: t("sections.attars") },
          ...(footnotes.list.length ? [{ id: "references", text: t("wiki.references") }] : []),
        ]}
        aside={<MediaFigure media={d.media[0]} type="note" alt={note.name} />}
      >
        <WikiSection id="overview" title={t("attar.overview")}>
          {summary.text ? <p className="text-lg leading-relaxed">{summary.text}</p> : <NotDocumented editHref={editHref} />}
        </WikiSection>
        <WikiSection id="smell" title={t("field.smell")}>
          <FieldBlock value={note.smell} field="smell" footnotes={footnotes} missing={d.missingCitations} editHref={editHref} />
        </WikiSection>
        <WikiSection id="botany" title={t("field.botany")}>
          <FieldBlock value={note.botany} field="botany" footnotes={footnotes} missing={d.missingCitations} editHref={editHref} />
        </WikiSection>
        <WikiSection id="grown" title={t("field.grown_in")}>
          <FieldBlock value={note.grown_in} field="grown_in" footnotes={footnotes} missing={d.missingCitations} editHref={editHref} />
        </WikiSection>
        <section id="attars" className="mb-10 scroll-mt-24">
          <h2 className="mb-1 text-2xl font-semibold">{t("sections.attars")}</h2>
          <p className="mb-4 text-sm text-muted">{t("wiki.inThisWiki", { count: total })}</p>
          {total === 0 ? <NotDocumented /> : null}
          {(["top", "heart", "base"] as const).map((pos) =>
            d.byPosition[pos].length ? (
              <div key={pos} className="mb-6">
                <h3 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wider text-muted">{t(`position.${pos}`)}</h3>
                <AttarCards attars={d.byPosition[pos]} headingLevel={3} />
              </div>
            ) : null,
          )}
        </section>
        <div className="reading">
          <References footnotes={footnotes} />
        </div>
      </WikiShell>
    </>
  );
}
