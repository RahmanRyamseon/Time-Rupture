import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PlaceholderMedia from "@/components/PlaceholderMedia";
import MemeEmbed from "@/components/MemeEmbed";
import UploadedMedia from "@/components/UploadedMedia";
import Badge from "@/components/Badge";
import MemeCard from "@/components/MemeCard";
import ShareButtons from "@/components/ShareButtons";
import ReportButton from "@/components/ReportButton";
import { getMemeBySlug, getRelatedMemes, memes } from "@/lib/data";
import { parseEmbed } from "@/lib/embeds";
import { formatCompactNumber, formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return memes.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/meme/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const meme = getMemeBySlug(slug);
  if (!meme) return { title: "Meme not found" };

  return {
    title: meme.title,
    description: meme.description,
    openGraph: {
      title: `${meme.title} | Meme Maloom`,
      description: meme.description,
    },
    twitter: {
      title: `${meme.title} | Meme Maloom`,
      description: meme.description,
    },
  };
}

const copyrightLabel: Record<string, string> = {
  attributed_fair_use: "Attributed · fair-use commentary",
  creator_verified: "Creator-verified submission",
  takedown_requested: "Takedown requested — under review",
  under_review: "Under moderation review",
};

export default async function MemeDetailPage({
  params,
}: PageProps<"/meme/[slug]">) {
  const { slug } = await params;
  const meme = getMemeBySlug(slug);
  if (!meme) notFound();

  const related = getRelatedMemes(meme);
  const canEmbed =
    meme.embedAllowed && meme.embedType && Boolean(parseEmbed(meme.embedType, meme.sourceUrl));
  const hasUploadedMedia = Boolean(meme.imageUrl && meme.uploadedMediaKind);

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="bg-mesh-light pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70"
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs font-semibold text-navy-500">
          <Link href="/" className="hover:text-violet-700">Home</Link>
          <span>/</span>
          <Link href="/explore" className="hover:text-violet-700">Explore</Link>
          <span>/</span>
          <span className="text-navy-800">{meme.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              <Badge tone="saffron">{meme.language}</Badge>
              <Badge tone="navy">{meme.region}</Badge>
              <Badge tone="pink">{meme.category}</Badge>
              <Badge tone="mint">{meme.contentType}</Badge>
            </div>
            <h1 className="font-display mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">
              {meme.title}
            </h1>
            <p className="mt-2 text-lg text-navy-600">{meme.description}</p>

            <div className="mt-6">
              {canEmbed ? (
                <>
                  <div className="overflow-hidden rounded-[28px] shadow-card">
                    <MemeEmbed
                      embedType={meme.embedType}
                      embedAllowed={meme.embedAllowed}
                      sourceUrl={meme.sourceUrl}
                      title={meme.title}
                      className="aspect-[16/9]"
                    />
                  </div>
                  <p className="mt-2 text-xs text-navy-500">
                    Live embed served directly from {meme.sourcePlatform} — nothing
                    is downloaded or hosted by Meme Maloom. Subject to that
                    platform&apos;s availability; if it stops loading, the entry
                    falls back to an illustration.{" "}
                    <a
                      href={meme.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-violet-700 underline"
                    >
                      Open the original ↗
                    </a>
                  </p>
                </>
              ) : hasUploadedMedia ? (
                <>
                  <UploadedMedia
                    src={meme.imageUrl as string}
                    kind={meme.uploadedMediaKind as "image" | "video"}
                    title={meme.title}
                    sourceUrl={meme.sourceUrl}
                    sourcePlatform={meme.sourcePlatform}
                    className="aspect-[16/9] shadow-card"
                  />
                  <p className="mt-2 text-xs text-navy-500">
                    Uploaded original, hosted on Meme Maloom. Originally from{" "}
                    <a
                      href={meme.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-violet-700 underline"
                    >
                      {meme.sourcePlatform}
                    </a>
                    .
                  </p>
                </>
              ) : (
                <>
                  <PlaceholderMedia
                    label={meme.imagePlaceholderLabel}
                    tone={meme.placeholderTone}
                    contentType={meme.contentType}
                    icon={meme.illustrationIcon}
                    category={meme.category}
                    className="aspect-[16/9] shadow-card"
                    linkHref={meme.sourceUrl}
                  />
                  <p className="mt-2 text-xs text-navy-500">
                    This is an original illustration, not the real meme image — click
                    it (or the link below) to see the actual meme on{" "}
                    <a
                      href={meme.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-violet-700 underline"
                    >
                      {meme.sourcePlatform}
                    </a>
                    .
                  </p>
                </>
              )}
            </div>

            <Section title="Explanation">
              <p>{meme.explanation}</p>
            </Section>

            <Section title="Origin & first-known usage">
              <p className="text-sm font-bold text-violet-700">{formatDate(meme.originDate)}</p>
              <p className="mt-1">{meme.originStory}</p>
            </Section>

            <Section title="Cultural context">
              <p>{meme.culturalContext}</p>
            </Section>

            {meme.translation || meme.transliteration ? (
              <Section title="Translation & transliteration">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {meme.transliteration ? (
                    <div className="rounded-2xl bg-gradient-to-br from-navy-900/4 to-violet-900/5 p-4">
                      <dt className="text-xs font-bold tracking-wide text-navy-500 uppercase">
                        Transliteration
                      </dt>
                      <dd className="mt-1 font-semibold text-navy-900">{meme.transliteration}</dd>
                    </div>
                  ) : null}
                  {meme.translation ? (
                    <div className="rounded-2xl bg-gradient-to-br from-navy-900/4 to-violet-900/5 p-4">
                      <dt className="text-xs font-bold tracking-wide text-navy-500 uppercase">
                        English translation
                      </dt>
                      <dd className="mt-1 font-semibold text-navy-900">{meme.translation}</dd>
                    </div>
                  ) : null}
                </dl>
              </Section>
            ) : null}

            <Section title="Popular variations">
              <ul className="flex flex-col gap-2">
                {meme.variations.map((v) => (
                  <li
                    key={v}
                    className="rounded-2xl border border-navy-900/8 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    {v}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Share this explainer">
              <ShareButtons title={meme.title} />
            </Section>

            <Section title="Report or request removal">
              <ReportButton memeTitle={meme.title} />
            </Section>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            <div className="rounded-[28px] border border-navy-900/8 bg-white p-5 shadow-card">
              <h2 className="font-display text-sm font-bold text-navy-900">Meme details</h2>
              <dl className="mt-3 flex flex-col divide-y divide-navy-900/8 text-sm">
                <Row label="Language" value={meme.language} />
                <Row label="Region" value={meme.region} />
                <Row label="Category" value={meme.category} />
                <Row label="Content type" value={meme.contentType} />
                <Row label="First known usage" value={formatDate(meme.originDate)} />
                <Row label="Creator / attribution" value={meme.creator ?? "Community-originated"} />
                <Row
                  label="Popularity score"
                  value={`${meme.popularityScore}/100`}
                />
                <Row
                  label="24h growth"
                  value={`${meme.growth24h > 0 ? "+" : ""}${meme.growth24h}%`}
                />
                <Row label="Shares" value={formatCompactNumber(meme.shareCount)} />
                <Row
                  label="Times explained"
                  value={formatCompactNumber(meme.explainViewCount)}
                />
                <Row label="Copyright status" value={copyrightLabel[meme.copyrightStatus]} />
              </dl>
              <a
                href={meme.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-2.5 text-center text-sm font-bold text-white shadow-[var(--shadow-glow-violet)] transition hover:-translate-y-0.5"
              >
                View original source ↗
              </a>
            </div>

            <div className="rounded-[28px] border-2 border-dashed border-navy-900/15 bg-navy-900/[0.03] p-5 text-xs text-navy-500">
              <p className="font-bold text-navy-700">Attribution</p>
              <p className="mt-1">
                Explanation and cultural commentary © Meme Maloom contributors.
                Original media belongs to {meme.creator ?? "its original creator(s)"} via{" "}
                {meme.sourcePlatform}. We link out rather than rehost. See our{" "}
                <Link href="/copyright" className="font-semibold text-violet-700 underline">
                  copyright &amp; takedown policy
                </Link>
                .
              </p>
            </div>

            {meme.tags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {meme.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/explore?q=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy-600 shadow-sm transition hover:bg-violet-100 hover:text-violet-700"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : null}
          </aside>
        </div>

        {related.length ? (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-bold text-navy-900">Related memes</h2>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <MemeCard key={r.id} meme={r} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display flex items-center gap-2 text-xl font-bold text-navy-900">
        <span aria-hidden="true" className="h-5 w-1.5 rounded-full bg-gradient-to-b from-violet-500 to-pink-500" />
        {title}
      </h2>
      <div className="mt-2 flex flex-col gap-2 pl-3.5 text-navy-700">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-navy-500">{label}</dt>
      <dd className="text-right font-semibold text-navy-900">{value}</dd>
    </div>
  );
}
