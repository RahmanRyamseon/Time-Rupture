import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { articles, getArticleBySlug } from "@/lib/data/articles";
import { formatDate } from "@/lib/helpers";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticleBySlug(slug);
  if (!a) return {};
  return { title: a.title, description: a.summary };
}

export default async function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const a = getArticleBySlug(slug);
  if (!a) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/articles" className="text-sm text-[var(--color-teal)] hover:underline">
        ← All articles
      </Link>
      <span className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--color-teal)]">{a.category}</span>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{a.title}</h1>
      <p className="mt-2 text-xs text-slate-400">Published {formatDate(a.published_date)}</p>
      <div className="prose prose-sm mt-6 max-w-none space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {a.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
