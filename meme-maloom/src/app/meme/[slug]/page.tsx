import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PlaceholderMedia from "@/components/PlaceholderMedia";
import Badge from "@/components/Badge";
import MemeCard from "@/components/MemeCard";
import ShareButtons from "@/components/ShareButtons";
import ReportButton from "@/components/ReportButton";
import { getMemeBySlug, getRelatedMemes, memes } from "@/lib/data";
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs font-semibold text-navy-500">
        <Link href="/" className="hover:text-saffron-600">Home</Link>
        <span>/</span>
        <Link href="/explore" className="hover:text-saffron-600">Explore</Link>
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
          <h1 className="font-display mt-3 text-3xl font-extrabold text-navy-900 sm:text-4xl">
            {meme.title}
          </h1>
          <p className="mt-2 text-lg text-navy-600">{meme.description}</p>

          <div className="mt-6">
            <PlaceholderMedia
              label={meme.imagePlaceholderLabel}
              tone={meme.placeholderTone}
              contentType={meme.contentType}
              icon={meme.illustrationIcon}
              category={meme.category}
              className="aspect-[16/9]"
            />
            <p className="mt-2 text-xs text-navy-500">
              This is an original illustration, not the real meme image — we
              don&apos;t mirror third-party media. See the actual meme on{" "}
              <a
                href={meme.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-saffron-600 underline"
              >
                {meme.sourcePlatform}
              </a>
              .
            </p>
          </div>

          <Section title="Explanation">
            <p>{meme.explanation}</p>
          </Section>

          <Section title="Origin & first-known usage">
            <p className="text-sm font-bold text-navy-500">{formatDate(meme.originDate)}</p>
            <p className="mt-1">{meme.originStory}</p>
          </Section>

          <Section title="Cultural context">
            <p>{meme.culturalContext}</p>
          </Section>

          {meme.translation || meme.transliteration ? (
            <Section title="Translation & transliteration">
              <dl className="grid gap-3 sm:grid-cols-2">
                {meme.transliteration ? (
                  <div className="rounded-2xl bg-navy-900/5 p-4">
                    <dt className="text-xs font-bold tracking-wide text-navy-500 uppercase">
                      Transliteration
                    </dt>
                    <dd className="mt-1 font-semibold text-navy-900">{meme.transliteration}</dd>
                  </div>
                ) : null}
                {meme.translation ? (
                  <div className="rounded-2xl bg-navy-900/5 p-4">
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
                  className="rounded-xl border-2 border-navy-900/10 bg-white px-4 py-3 text-sm"
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
          <div className="rounded-3xl border-2 border-navy-900/10 bg-white p-5">
            <h2 className="font-display text-sm font-bold text-navy-900">Meme details</h2>
            <dl className="mt-3 flex flex-col divide-y divide-navy-900/10 text-sm">
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
              className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-navy-900 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-navy-800"
            >
              View original source ↗
            </a>
          </div>

          <div className="rounded-3xl border-2 border-dashed border-navy-900/15 bg-navy-900/[0.03] p-5 text-xs text-navy-500">
            <p className="font-bold text-navy-700">Attribution</p>
            <p className="mt-1">
              Explanation and cultural commentary © Meme Maloom contributors.
              Original media belongs to {meme.creator ?? "its original creator(s)"} via{" "}
              {meme.sourcePlatform}. We link out rather than rehost. See our{" "}
              <Link href="/copyright" className="underline">
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
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy-600 shadow-sm transition hover:bg-saffron-100 hover:text-saffron-700"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      {related.length ? (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-extrabold text-navy-900">Related memes</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <MemeCard key={r.id} meme={r} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-navy-900">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-navy-700">{children}</div>
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
