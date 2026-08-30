"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cardById, BANKS, activeCards } from "@/data/cards";
import { useAppState } from "@/lib/store";
import { estimateMonthlyValueFils } from "@/lib/rewards";
import { fmtFils } from "@/lib/format";
import { DataDisclaimer } from "@/components/DataDisclaimer";

const FEATURES = [
  {
    href: "/wallet",
    title: "My Wallet",
    blurb: "Add your Bahrain cards from a curated database — no bank login, ever.",
    icon: "👛",
  },
  {
    href: "/swipe",
    title: "Smart Swipe Advisor",
    blurb: "Pick a category and amount — instantly see which card in your wallet earns the most.",
    icon: "⚡",
  },
  {
    href: "/points",
    title: "Points Valuation Engine",
    blurb: "See what your points are really worth: cashback vs. airline/hotel transfer.",
    icon: "💎",
  },
  {
    href: "/transfers",
    title: "Transfer Partner Navigator",
    blurb: "The full bank-points → Falconflyer/AlFursan/Shukran transfer map, with a simulator.",
    icon: "🔁",
  },
];

export default function Home() {
  const { cardIds, hydrated } = useAppState();

  const walletCards = useMemo(
    () => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c),
    [cardIds],
  );
  const totalMonthlyValue = walletCards.reduce((sum, c) => sum + estimateMonthlyValueFils(c, true), 0);

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <span className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
          Bahrain · Phase 1 MVP
        </span>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Which card should you swipe? What are your points actually worth?
        </h1>
        <p className="max-w-xl text-foreground/70">
          <strong>Nuqati</strong> (نقاطي — &ldquo;my points&rdquo;) is a GCC credit card rewards optimizer.
          Manually add the cards you already carry and get real-time, merchant-category recommendations,
          honest points valuations, and the transfer map no bank or comparison site publishes — starting
          with {activeCards().length} major cards across {BANKS.length} Bahrain issuing entities.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/wallet"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            {hydrated && walletCards.length > 0 ? "Manage my wallet" : "Add your first card"}
          </Link>
          <Link
            href="/swipe"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-muted"
          >
            Try Smart Swipe
          </Link>
        </div>
      </section>

      {hydrated && walletCards.length > 0 && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Cards in your wallet" value={String(walletCards.length)} />
          <StatTile label="Est. cashback value / month*" value={fmtFils(totalMonthlyValue)} />
          <StatTile label="Banks covered" value={String(BANKS.length)} />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Everything you need to optimize your wallet</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="card-surface flex flex-col gap-2 rounded-2xl p-5 transition-shadow hover:shadow-md"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-foreground/60">{f.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card-surface rounded-2xl p-5">
        <h2 className="text-lg font-semibold">How the reward caps work</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Many Bahrain cards pay a bonus rate on a category (e.g. 3x on groceries) only up to a monthly spend
          cap. Nuqati tracks how much of that cap you&apos;ve used <em>this billing cycle</em> — once it&apos;s
          fully used, Smart Swipe automatically shows the card reverting to its base rate. The cap
          restarts on its own the moment the next cycle begins, no action needed. Log your swipes on the{" "}
          <Link href="/swipe" className="font-medium text-brand-strong underline">
            Smart Swipe
          </Link>{" "}
          page to track this in real time.
        </p>
      </section>

      <section className="text-sm text-foreground/60">
        <h2 className="mb-2 text-lg font-semibold text-foreground">Roadmap beyond Phase 1</h2>
        <p>
          This MVP covers Wallet, Smart Swipe, Points Valuation and Transfer Navigator — the core Phase 1
          feature set. Spend tracking against welcome bonuses, an annual fee vs. rewards analyzer, points
          expiry alerts, and an AI points concierge are planned for later phases as the app expands beyond
          Bahrain to the rest of the GCC.
        </p>
      </section>

      <DataDisclaimer />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-strong">{value}</p>
    </div>
  );
}
