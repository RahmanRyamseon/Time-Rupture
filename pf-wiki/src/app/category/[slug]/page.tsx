import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORIES, categoryBySlug } from "@/data/categories";
import { problemsByCategory } from "@/data/problems";
import { ProblemCard } from "@/components/ProblemCard";
import { DataDisclaimer } from "@/components/DataDisclaimer";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) return { title: "Not found — PF Wiki" };
  return {
    title: `${category.name} — PF Wiki`,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const entries = problemsByCategory(category.slug);

  return (
    <div className="flex flex-col gap-8">
      <nav className="text-sm text-foreground/50">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        / <span className="text-foreground/70">{category.name}</span>
      </nav>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{category.icon}</span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
          <p className="mt-1 text-foreground/60">{category.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <ProblemCard key={entry.slug} entry={entry} />
        ))}
      </div>
      <DataDisclaimer />
    </div>
  );
}
