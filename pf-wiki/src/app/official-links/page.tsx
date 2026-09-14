import type { Metadata } from "next";
import { OFFICIAL_LINKS } from "@/data/officialLinks";
import { DataDisclaimer } from "@/components/DataDisclaimer";

export const metadata: Metadata = {
  title: "Official EPFO Links — PF Wiki",
  description: "Direct links to the real, official EPFO portals, grievance system, and apps.",
};

export default function OfficialLinksPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Official EPFO links</h1>
        <p className="mt-1 max-w-xl text-foreground/60">
          PF Wiki explains problems and workarounds — but every actual claim, KYC update, or grievance
          has to be filed on EPFO&apos;s own systems. These are the real destinations.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OFFICIAL_LINKS.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-surface flex flex-col gap-2 rounded-2xl p-5 transition-shadow hover:shadow-md"
          >
            <h2 className="font-semibold text-brand-strong">{link.title}</h2>
            <p className="text-sm text-foreground/60">{link.description}</p>
          </a>
        ))}
      </div>
      <DataDisclaimer />
    </div>
  );
}
