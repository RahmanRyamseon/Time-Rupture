import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INDIAN_STATES, slugToStateName } from "@/lib/data/states";
import { opportunities } from "@/lib/data/opportunities";
import OpportunityListing from "@/components/OpportunityListing";

export function generateStaticParams() {
  return INDIAN_STATES.map((s) => ({ state: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/states/[state]">): Promise<Metadata> {
  const { state } = await params;
  const name = slugToStateName(state);
  if (!name) return {};
  return {
    title: `${name} — Government Jobs, Scholarships & Admissions`,
    description: `Verified government jobs, scholarships, minority welfare schemes and admissions available in ${name}, with links to the official ${name} state portal.`,
  };
}

export default async function StateDetailPage({ params }: PageProps<"/states/[state]">) {
  const { state } = await params;
  const info = INDIAN_STATES.find((s) => s.slug === state);
  if (!info) notFound();

  const listings = opportunities.filter((o) => o.state === info.name || o.state === "All India");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{info.name}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          State-specific and All-India opportunities relevant to {info.name}.{" "}
          <a
            href={info.officialPortal}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--color-teal)] underline"
          >
            Visit the official {info.name} state portal ↗
          </a>
        </p>
      </header>
      <OpportunityListing opportunities={listings} />
    </div>
  );
}
