import type { Metadata } from "next";
import Link from "next/link";
import Badge from "@/components/Badge";
import StatBar from "@/components/StatBar";
import StatTile from "@/components/StatTile";
import {
  memes,
  getTrendingMemes,
  getEngagementScore,
  getEngagementLeaderboard,
  sourcePlatformDistribution,
} from "@/lib/data";
import { distribution, formatCompactNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Trending Dashboard",
  description:
    "A visual dashboard of trending Indian memes, 24-hour growth, language and regional distribution, and engagement scores. Demo data.",
};

export default function TrendingPage() {
  const trending = getTrendingMemes(8);
  const leaderboard = getEngagementLeaderboard(6);

  const languageDist = distribution(memes, (m) => m.language);
  const regionDist = distribution(memes, (m) => m.region);
  const categoryDist = distribution(memes, (m) => m.category);

  const maxLang = Math.max(...languageDist.map((d) => d.count));
  const maxRegion = Math.max(...regionDist.map((d) => d.count));
  const maxCategory = Math.max(...categoryDist.map((d) => d.count));
  const maxSource = Math.max(...sourcePlatformDistribution.map((d) => d.share));

  const totalShares = memes.reduce((s, m) => s + m.shareCount, 0);
  const totalExplains = memes.reduce((s, m) => s + m.explainViewCount, 0);
  const avgGrowth = memes.reduce((s, m) => s + m.growth24h, 0) / memes.length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold tracking-widest text-saffron-600 uppercase">
            Live pulse
          </p>
          <Badge tone="pink">Demo data — for prototype purposes only</Badge>
        </div>
        <h1 className="font-display text-3xl font-extrabold text-navy-900 sm:text-4xl">
          Trending dashboard
        </h1>
        <p className="max-w-2xl text-navy-600">
          A snapshot of what&apos;s climbing across Meme Maloom right now.
          All numbers on this page are sample data for prototyping — a
          production build would connect this to real ingestion and
          analytics pipelines.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Memes tracked" value={String(memes.length)} />
        <StatTile label="Total shares" value={formatCompactNumber(totalShares)} />
        <StatTile label="Explain views" value={formatCompactNumber(totalExplains)} />
        <StatTile
          label="Avg. 24h growth"
          value={`+${avgGrowth.toFixed(1)}%`}
          hint="Across all tracked memes"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Trending memes */}
        <div className="rounded-3xl border-2 border-navy-900/10 bg-white p-5 lg:col-span-3">
          <h2 className="font-display text-lg font-bold text-navy-900">
            Trending memes · last 24 hours
          </h2>
          <ol className="mt-4 flex flex-col divide-y divide-navy-900/10">
            {trending.map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/meme/${m.slug}`}
                    className="truncate font-bold text-navy-900 hover:text-saffron-600"
                  >
                    {m.title}
                  </Link>
                  <p className="truncate text-xs text-navy-500">
                    {m.language} · {m.region} · {m.category}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-mint-50 px-2.5 py-1 text-xs font-extrabold text-mint-600">
                  ▲ {m.growth24h}%
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Source platform distribution */}
        <div className="rounded-3xl border-2 border-navy-900/10 bg-white p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-navy-900">Source platform</h2>
          <p className="text-xs text-navy-500">Share of tracked memes by origin platform</p>
          <div className="mt-4 flex flex-col gap-3">
            {sourcePlatformDistribution.map((d) => (
              <StatBar
                key={d.platform}
                label={d.platform}
                count={d.share}
                max={maxSource}
                tone="navy"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border-2 border-navy-900/10 bg-white p-5">
          <h2 className="font-display text-lg font-bold text-navy-900">Language distribution</h2>
          <div className="mt-4 flex flex-col gap-3">
            {languageDist.map((d) => (
              <StatBar key={d.label} label={d.label} count={d.count} max={maxLang} tone="saffron" />
            ))}
          </div>
        </div>
        <div className="rounded-3xl border-2 border-navy-900/10 bg-white p-5">
          <h2 className="font-display text-lg font-bold text-navy-900">Regional distribution</h2>
          <div className="mt-4 flex flex-col gap-3">
            {regionDist.map((d) => (
              <StatBar key={d.label} label={d.label} count={d.count} max={maxRegion} tone="mint" />
            ))}
          </div>
        </div>
        <div className="rounded-3xl border-2 border-navy-900/10 bg-white p-5">
          <h2 className="font-display text-lg font-bold text-navy-900">Category distribution</h2>
          <div className="mt-4 flex flex-col gap-3">
            {categoryDist.map((d) => (
              <StatBar key={d.label} label={d.label} count={d.count} max={maxCategory} tone="pink" />
            ))}
          </div>
        </div>
      </div>

      {/* Engagement leaderboard */}
      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-navy-900/10 bg-white">
        <div className="p-5 pb-0">
          <h2 className="font-display text-lg font-bold text-navy-900">Engagement leaderboard</h2>
          <p className="text-xs text-navy-500">
            Composite score blending popularity, shares and explain-views. Demo formula.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-y border-navy-900/10 text-xs font-bold tracking-wide text-navy-500 uppercase">
                <th className="px-5 py-3">Meme</th>
                <th className="px-5 py-3">Shares</th>
                <th className="px-5 py-3">Explain views</th>
                <th className="px-5 py-3">Engagement score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/10">
              {leaderboard.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3">
                    <Link href={`/meme/${m.slug}`} className="font-bold text-navy-900 hover:text-saffron-600">
                      {m.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-navy-600">{formatCompactNumber(m.shareCount)}</td>
                  <td className="px-5 py-3 text-navy-600">{formatCompactNumber(m.explainViewCount)}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-saffron-100 px-2.5 py-1 text-xs font-extrabold text-saffron-800">
                      {getEngagementScore(m)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
