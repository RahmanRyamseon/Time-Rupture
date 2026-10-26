import type { ReactNode } from "react";
import { LEGAL_LAST_UPDATED, LEGAL_REVIEW_NOTICE } from "@/lib/legal";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
          Last updated {LEGAL_LAST_UPDATED}
        </p>
        {intro && <p className="max-w-2xl text-sm text-foreground/70">{intro}</p>}
      </header>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-foreground/80 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:font-semibold [&_h3]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_a]:font-medium [&_a]:text-brand-strong [&_a]:underline">
        {children}
      </div>

      <div className="card-surface rounded-2xl p-4 text-xs text-foreground/60">
        <strong className="text-foreground">Not legal advice.</strong> {LEGAL_REVIEW_NOTICE}
      </div>
    </article>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2>{heading}</h2>
      {children}
    </section>
  );
}
