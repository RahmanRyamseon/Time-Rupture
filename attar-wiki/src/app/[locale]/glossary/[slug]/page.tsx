import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGlossaryEntry } from "@/lib/data/wiki";
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
import { JsonLd } from "@/components/wiki/JsonLd";
import { markdownHeadings } from "@/components/wiki/Markdown";

export const revalidate = 600;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const d = await getGlossaryEntry(slug);
  if (!d) return {};
  return pageMetadata(`/glossary/${slug}`, locale, pick(locale, d.entry.term, d.entry.term_hi).text ?? d.entry.term,
    pick(locale, d.entry.short_definition, d.entry.short_definition_hi).text);
}

export default async function GlossaryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = await getGlossaryEntry(slug);
  if (!d || !d.entry.published) notFound();
  const t = await getTranslations();
  const { entry } = d;
  const footnotes = buildFootnotes(d.citations, SECTION_DEFS.glossary.fields.map((f) => f.name));
  const editHref = `/glossary/${slug}/edit`;
  const term = pick(locale, entry.term, entry.term_hi);
  const def = pick(locale, entry.short_definition, entry.short_definition_hi);
  const headings = markdownHeadings(entry.body);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: entry.term,
          alternateName: [entry.term_hi, ...entry.aliases].filter(Boolean),
          description: entry.short_definition ?? undefined,
          url: absoluteUrl(`/glossary/${slug}`, locale),
          inDefinedTermSet: { "@type": "DefinedTermSet", name: `${SITE_NAME} glossary`, url: absoluteUrl("/glossary", locale) },
        }}
      />
      <WikiShell
        section="glossary"
        type="glossary"
        id={entry.id}
        slug={slug}
        title={term.text ?? entry.term}
        eyebrow={t("sections.glossary")}
        subtitle={entry.aliases.length ? entry.aliases.join(", ") : undefined}
        updatedAt={entry.updated_at}
        revisionCount={d.revisionCount}
        englishOnly={term.isFallback}
        toc={[{ id: "definition", text: t("field.short_definition") }, ...headings, ...(footnotes.list.length ? [{ id: "references", text: t("wiki.references") }] : [])]}
      >
        <WikiSection id="definition" title={t("field.short_definition")}>
          {def.text ? (
            <p className="text-lg leading-relaxed">
              {def.text}
              <Cite field="short_definition" footnotes={footnotes} missing={d.missingCitations} />
            </p>
          ) : (
            <NotDocumented editHref={editHref} />
          )}
        </WikiSection>
        <div className="reading mb-10">
          <FieldBlock value={entry.body} field="body" footnotes={footnotes} missing={d.missingCitations} editHref={editHref} />
        </div>
        <div className="reading">
          <References footnotes={footnotes} />
        </div>
      </WikiShell>
    </>
  );
}
