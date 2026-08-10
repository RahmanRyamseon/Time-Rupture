import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import MemeCard from "@/components/MemeCard";
import LanguageCard from "@/components/LanguageCard";
import RegionCard from "@/components/RegionCard";
import CategoryCard from "@/components/CategoryCard";
import Newsletter from "@/components/Newsletter";
import Badge from "@/components/Badge";
import {
  getFeaturedMemes,
  getTrendingMemes,
  languageInfo,
  regionInfo,
  categoryInfo,
  memes,
} from "@/lib/data";
import { formatCompactNumber } from "@/lib/utils";

export default function Home() {
  const featured = getFeaturedMemes(4);
  const trending = getTrendingMemes(6);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-dot-grid">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-saffron-50 via-cream to-cream"
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <Badge tone="pink" className="text-sm">
            🇮🇳 Pan-India meme discovery, explained
          </Badge>
          <h1 className="font-display max-w-3xl text-4xl leading-tight font-extrabold text-navy-900 sm:text-5xl lg:text-6xl">
            Understand the meme.{" "}
            <span className="text-saffron-600">Discover the story.</span>
          </h1>
          <p className="max-w-xl text-base text-navy-600 sm:text-lg">
            Meme Maloom explains the origin, language and cultural context
            behind Indian memes — from Bollywood dialogue to Tamil Reels
            edits. <span className="font-semibold text-navy-800">Meme ka matlab maloom?</span>
          </p>
          <div className="w-full max-w-xl">
            <SearchBar size="lg" autoFocus={false} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-navy-500">
            <span>Try:</span>
            {["Bhai wah", "Vaathi Coming", "Thaggede Le", "Balle Balle"].map((t) => (
              <Link
                key={t}
                href={`/explore?q=${encodeURIComponent(t)}`}
                className="rounded-full bg-white px-3 py-1.5 shadow-sm transition hover:bg-saffron-100 hover:text-saffron-700"
              >
                {t}
              </Link>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-6 sm:gap-12">
            <div>
              <dt className="sr-only">Memes explained</dt>
              <dd className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">
                {memes.length}+
              </dd>
              <dd className="text-xs font-semibold text-navy-500">memes explained</dd>
            </div>
            <div>
              <dt className="sr-only">Languages covered</dt>
              <dd className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">10</dd>
              <dd className="text-xs font-semibold text-navy-500">languages covered</dd>
            </div>
            <div>
              <dt className="sr-only">Regions covered</dt>
              <dd className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">6</dd>
              <dd className="text-xs font-semibold text-navy-500">regions covered</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Featured memes */}
      <SectionShell
        eyebrow="Handpicked"
        title="Featured memes"
        description="A curated starting point — the memes we think best show what Meme Maloom is about."
        action={{ href: "/explore", label: "See all memes" }}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((meme) => (
            <MemeCard key={meme.id} meme={meme} />
          ))}
        </div>
      </SectionShell>

      {/* Trending today */}
      <SectionShell
        tone="navy"
        eyebrow="Right now"
        title="Trending today"
        description="Demo growth data — the fastest-climbing entries over the last 24 hours."
        action={{ href: "/trending", label: "Open trending dashboard" }}
      >
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {trending.map((meme) => (
            <div key={meme.id} className="w-[80vw] shrink-0 snap-start sm:w-auto">
              <MemeCard meme={meme} />
            </div>
          ))}
        </div>
      </SectionShell>

      {/* Explore by language */}
      <SectionShell
        eyebrow="10 languages and counting"
        title="Explore by language"
        description="Every meme entry comes with translation and transliteration — no context lost."
        action={{ href: "/languages", label: "See all languages" }}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {languageInfo.slice(0, 6).map((info) => (
            <LanguageCard key={info.language} info={info} />
          ))}
        </div>
      </SectionShell>

      {/* Explore by region */}
      <SectionShell
        tone="navy"
        eyebrow="One country, many cultures"
        title="Explore by region"
        description="Meme culture looks different in Kochi than it does in Amritsar — we map both."
        action={{ href: "/regions", label: "See all regions" }}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {regionInfo.map((info) => (
            <RegionCard key={info.region} info={info} />
          ))}
        </div>
      </SectionShell>

      {/* Popular categories */}
      <SectionShell
        eyebrow="Pick a vibe"
        title="Popular categories"
        description="From office standups to festival food comas — browse by what the meme is actually about."
        action={{ href: "/categories", label: "See all categories" }}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categoryInfo.map((info) => (
            <CategoryCard key={info.category} info={info} />
          ))}
        </div>
      </SectionShell>

      {/* Newsletter */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <Newsletter />
      </section>

      {/* Stat strip */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-6 text-center text-xs text-navy-400 sm:px-6 lg:px-8">
        {formatCompactNumber(
          memes.reduce((sum, m) => sum + m.explainViewCount, 0)
        )}{" "}
        cultural explanations served so far · demo data
      </div>
    </div>
  );
}

function SectionShell({
  eyebrow,
  title,
  description,
  action,
  tone = "cream",
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: { href: string; label: string };
  tone?: "cream" | "navy";
  children: React.ReactNode;
}) {
  return (
    <section className={tone === "navy" ? "bg-navy-950/[0.03]" : undefined}>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold tracking-widest text-saffron-600 uppercase">
              {eyebrow}
            </p>
            <h2 className="font-display mt-1 text-2xl font-extrabold text-navy-900 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-navy-600 sm:text-base">{description}</p>
          </div>
          <Link
            href={action.href}
            className="shrink-0 rounded-full border-2 border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition hover:border-saffron-500 hover:text-saffron-600"
          >
            {action.label} →
          </Link>
        </div>
        {children}
      </div>
    </section>
  );
}
