import Link from "next/link";
import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";
import { CATEGORIES } from "@/data/categories";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-foreground/70">
          That page doesn&apos;t exist — but the problem you&apos;re looking for might still be here.
          Try searching, or browse by category below.
        </p>
      </div>
      <SearchBox autoFocus />
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="rounded-full bg-surface-muted px-3 py-1.5 text-sm font-medium text-foreground/70 hover:text-foreground"
          >
            <span aria-hidden="true">{c.icon}</span> {c.name}
          </Link>
        ))}
      </div>
      <Link href="/" className="text-sm font-medium text-brand-strong hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}
