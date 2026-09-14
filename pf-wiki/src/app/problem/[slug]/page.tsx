import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PROBLEMS, problemBySlug, relatedProblems } from "@/data/problems";
import { categoryBySlug } from "@/data/categories";
import { SourceList } from "@/components/SourceList";
import { DataDisclaimer } from "@/components/DataDisclaimer";
import { ProblemCard } from "@/components/ProblemCard";

export function generateStaticParams() {
  return PROBLEMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = problemBySlug(slug);
  if (!entry) return { title: "Not found — PF Wiki" };
  return {
    title: `${entry.title} — PF Wiki`,
    description: entry.short,
  };
}

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = problemBySlug(slug);
  if (!entry) notFound();

  const category = categoryBySlug(entry.category);
  const related = relatedProblems(entry);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <nav className="text-sm text-foreground/50">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          /{" "}
          {category && (
            <>
              <Link href={`/category/${category.slug}`} className="hover:underline">
                {category.name}
              </Link>{" "}
              /{" "}
            </>
          )}
          <span className="text-foreground/70">{entry.title}</span>
        </nav>
        {category && (
          <span className="w-fit rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-strong">
            {category.icon} {category.name}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{entry.title}</h1>
        <p className="text-foreground/70">{entry.short}</p>
        <p className="text-xs text-foreground/45">Last verified {entry.lastVerified}</p>
      </div>

      <Section title="How this usually shows up">
        <BulletList items={entry.symptoms} />
      </Section>

      <Section title="Likely causes">
        <BulletList items={entry.likelyCauses} />
      </Section>

      <Section title="How to fix it">
        <ol className="flex flex-col gap-3">
          {entry.fixSteps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-foreground/80">{step}</span>
            </li>
          ))}
        </ol>
        {entry.relatedForms && entry.relatedForms.length > 0 && (
          <p className="mt-4 text-sm text-foreground/60">
            <strong>Forms involved:</strong> {entry.relatedForms.join(", ")}
          </p>
        )}
      </Section>

      <Section title="How people actually solved it" tone="accent">
        <p className="mb-3 text-xs text-foreground/50">
          Crowd-sourced from forums, Quora, and social media reports — not official EPFO guidance.
        </p>
        <BulletList items={entry.communitySolutions} />
      </Section>

      <Section title="If nothing above works: escalate">
        <BulletList items={entry.officialEscalation} />
      </Section>

      <Section title="Sources">
        <SourceList sources={entry.sources} />
      </Section>

      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Related problems</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <ProblemCard key={r.slug} entry={r} />
            ))}
          </div>
        </section>
      )}

      <DataDisclaimer />
    </div>
  );
}

function Section({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <section
      className={`card-surface rounded-2xl p-5 ${tone === "accent" ? "border-accent/40 bg-accent-soft/40" : ""}`}
    >
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/80">
          <span className="text-brand-strong">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
