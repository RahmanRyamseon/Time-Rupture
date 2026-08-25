import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import MemeCard from "@/components/MemeCard";
import LanguageCard from "@/components/LanguageCard";
import RegionCard from "@/components/RegionCard";
import CategoryCard from "@/components/CategoryCard";
import Newsletter from "@/components/Newsletter";
import Badge from "@/components/Badge";
import Reveal from "@/components/Reveal";
import HeroFloaters from "@/components/HeroFloaters";
import ScriptMarquee from "@/components/ScriptMarquee";
import WaveDivider from "@/components/WaveDivider";
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
    <div className="flex flex-col overflow-x-clip">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="bg-mesh-light pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="animate-blob pointer-events-none absolute top-[-10%] left-[-10%] h-80 w-80 bg-gradient-to-br from-violet-300/50 to-pink-300/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="animate-blob pointer-events-none absolute right-[-8%] bottom-[-15%] h-96 w-96 bg-gradient-to-br from-saffron-300/40 to-mint-300/30 blur-3xl"
          style={{ animationDelay: "4s" }}
        />
        <HeroFloaters />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <Badge tone="lime" className="animate-glow-pulse text-sm shadow-[var(--shadow-glow-lime)]">
            🇮🇳 Pan-India meme discovery, explained
          </Badge>
          <h1 className="font-display max-w-4xl text-5xl leading-[0.98] font-bold text-navy-900 sm:text-6xl lg:text-7xl">
            Understand the meme.{" "}
            <span className="relative inline-block text-gradient">
              Discover the story.
              <svg
                aria-hidden="true"
                viewBox="0 0 300 16"
                className="absolute -bottom-2 left-0 h-3 w-full sm:-bottom-3 sm:h-4"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="hero-underline" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="var(--color-violet-500)" />
                    <stop offset="50%" stopColor="var(--color-pink-500)" />
                    <stop offset="100%" stopColor="var(--color-saffron-500)" />
                  </linearGradient>
                </defs>
                <path
                  d="M2 10c40-9 220-9 296 2"
                  fill="none"
                  stroke="url(#hero-underline)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="max-w-xl text-base text-navy-600 sm:text-lg">
            Meme Maloom explains the origin, language and cultural context
            behind Indian memes — from Bollywood dialogue to Tamil Reels
            edits. <span className="font-bold text-navy-900">Meme ka matlab maloom?</span>
          </p>
          <div className="w-full max-w-xl">
            <SearchBar size="lg" autoFocus={false} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-navy-500">
            <span>Try:</span>
            {["Bhai wah", "Vaathi Coming", "Thaggede Le", "Balle Balle"].map((t) => (
              <Link
                key={t}
                href={`/explore?q=${encodeURIComponent(t)}`}
                className="glass rounded-full px-3 py-1.5 transition hover:-translate-y-0.5 hover:text-violet-700"
              >
                {t}
              </Link>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-6 sm:gap-12">
            <div>
              <dt className="sr-only">Memes explained</dt>
              <dd className="font-display text-gradient text-2xl font-bold sm:text-3xl">
                {memes.length}+
              </dd>
              <dd className="text-xs font-bold text-navy-500">memes explained</dd>
            </div>
            <div>
              <dt className="sr-only">Languages covered</dt>
              <dd className="font-display text-gradient text-2xl font-bold sm:text-3xl">10</dd>
              <dd className="text-xs font-bold text-navy-500">languages covered</dd>
            </div>
            <div>
              <dt className="sr-only">Regions covered</dt>
              <dd className="font-display text-gradient text-2xl font-bold sm:text-3xl">6</dd>
              <dd className="text-xs font-bold text-navy-500">regions covered</dd>
            </div>
          </dl>
        </div>
      </section>

      <ScriptMarquee />

      {/* Featured memes */}
      <SectionShell
        eyebrow="Handpicked"
        title="Featured memes"
        description="A curated starting point — the memes we think best show what Meme Maloom is about."
        action={{ href: "/explore", label: "See all memes" }}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((meme, i) => (
            <Reveal key={meme.id} delay={i * 60}>
              <MemeCard meme={meme} />
            </Reveal>
          ))}
        </div>
      </SectionShell>

      <WaveDivider />

      {/* Trending today */}
      <SectionShell
        tone="navy"
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
            </span>
            Right now
          </span>
        }
        title="Trending today"
        description="Demo growth data — the fastest-climbing entries over the last 24 hours."
        action={{ href: "/trending", label: "Open trending dashboard" }}
      >
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {trending.map((meme, i) => (
            <Reveal key={meme.id} delay={i * 60} className="w-[80vw] shrink-0 snap-start sm:w-auto">
              <MemeCard meme={meme} />
            </Reveal>
          ))}
        </div>
      </SectionShell>

      <WaveDivider flip />

      {/* Explore by language */}
      <SectionShell
        eyebrow="10 languages and counting"
        title="Explore by language"
        description="Every meme entry comes with translation and transliteration — no context lost."
        action={{ href: "/languages", label: "See all languages" }}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {languageInfo.slice(0, 6).map((info, i) => (
            <Reveal key={info.language} delay={i * 60}>
              <LanguageCard info={info} />
            </Reveal>
          ))}
        </div>
      </SectionShell>

      <WaveDivider />

      {/* Explore by region */}
      <SectionShell
        tone="navy"
        eyebrow="One country, many cultures"
        title="Explore by region"
        description="Meme culture looks different in Kochi than it does in Amritsar — we map both."
        action={{ href: "/regions", label: "See all regions" }}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {regionInfo.map((info, i) => (
            <Reveal key={info.region} delay={i * 60}>
              <RegionCard info={info} />
            </Reveal>
          ))}
        </div>
      </SectionShell>

      <WaveDivider flip />

      {/* Popular categories */}
      <SectionShell
        eyebrow="Pick a vibe"
        title="Popular categories"
        description="From office standups to festival food comas — browse by what the meme is actually about."
        action={{ href: "/categories", label: "See all categories" }}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categoryInfo.map((info, i) => (
            <Reveal key={info.category} delay={i * 40}>
              <CategoryCard info={info} />
            </Reveal>
          ))}
        </div>
      </SectionShell>

      {/* Newsletter */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <Reveal>
          <Newsletter />
        </Reveal>
      </section>

      {/* Stat strip */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-6 text-center text-xs font-semibold text-navy-400 sm:px-6 lg:px-8">
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
  eyebrow: React.ReactNode;
  title: string;
  description: string;
  action: { href: string; label: string };
  tone?: "cream" | "navy";
  children: React.ReactNode;
}) {
  const dark = tone === "navy";
  return (
    <section className={dark ? "relative overflow-hidden bg-navy-950" : "relative"}>
      {dark ? (
        <div aria-hidden="true" className="bg-mesh pointer-events-none absolute inset-0 opacity-50" />
      ) : null}
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p
              className={`text-xs font-bold tracking-widest uppercase ${
                dark ? "text-lime-400" : "text-gradient"
              }`}
            >
              {eyebrow}
            </p>
            <h2
              className={`font-display mt-1 text-2xl font-bold sm:text-3xl ${
                dark ? "text-white" : "text-navy-900"
              }`}
            >
              {title}
            </h2>
            <p className={`mt-2 max-w-xl text-sm sm:text-base ${dark ? "text-navy-300" : "text-navy-600"}`}>
              {description}
            </p>
          </div>
          <Link
            href={action.href}
            className={
              dark
                ? "glass-dark shrink-0 rounded-full px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5"
                : "shrink-0 rounded-full border-2 border-navy-900/12 px-4 py-2 text-sm font-bold text-navy-800 transition hover:-translate-y-0.5 hover:border-violet-400 hover:text-violet-700"
            }
          >
            {action.label} →
          </Link>
        </div>
        {children}
      </div>
    </section>
  );
}
