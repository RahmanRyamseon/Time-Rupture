import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getGuide } from "@/lib/data/wiki";
import { buildFootnotes } from "@/lib/citations";
import { pick } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/metadata";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { WikiShell } from "@/components/wiki/WikiShell";
import { FieldBlock } from "@/components/wiki/FieldBlock";
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
  const d = await getGuide(slug);
  if (!d) return {};
  return pageMetadata(`/guides/${slug}`, locale, pick(locale, d.guide.title, d.guide.title_hi).text ?? d.guide.title,
    pick(locale, d.guide.summary, d.guide.summary_hi).text);
}

export default async function GuidePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = await getGuide(slug);
  if (!d || !d.guide.published) notFound();
  const t = await getTranslations();
  const { guide } = d;
  const footnotes = buildFootnotes(d.citations, ["summary", "body"]);
  const title = pick(locale, guide.title, guide.title_hi);
  const summary = pick(locale, guide.summary, guide.summary_hi);
  const headings = markdownHeadings(guide.body);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.summary ?? undefined,
          author: guide.author_name ? { "@type": "Person", name: guide.author_name } : { "@type": "Organization", name: SITE_NAME },
          datePublished: guide.published_at ?? guide.created_at,
          dateModified: guide.updated_at,
          inLanguage: "en-IN",
          url: absoluteUrl(`/guides/${slug}`, locale),
          publisher: { "@type": "Organization", name: SITE_NAME },
        }}
      />
      <WikiShell
        section="guides"
        type="guide"
        id={guide.id}
        slug={slug}
        title={title.text ?? guide.title}
        eyebrow={t("types.guide")}
        subtitle={guide.author_name ?? undefined}
        updatedAt={guide.updated_at}
        revisionCount={d.revisionCount}
        englishOnly={locale === "hi"}
        toc={[...headings, ...(footnotes.list.length ? [{ id: "references", text: t("wiki.references") }] : [])]}
      >
        {summary.text ? <p className="reading mb-8 text-xl leading-relaxed text-cocoa">{summary.text}</p> : null}
        <div className="reading">
          <FieldBlock value={guide.body} field="body" footnotes={footnotes} missing={d.missingCitations} editHref={`/guides/${slug}/edit`} />
          <References footnotes={footnotes} />
        </div>
      </WikiShell>
    </>
  );
}
