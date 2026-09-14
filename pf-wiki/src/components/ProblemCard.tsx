import Link from "next/link";
import type { ProblemEntry } from "@/lib/types";
import { categoryBySlug } from "@/data/categories";

export function ProblemCard({ entry }: { entry: ProblemEntry }) {
  const category = categoryBySlug(entry.category);
  return (
    <Link
      href={`/problem/${entry.slug}`}
      className="card-surface flex flex-col gap-2 rounded-2xl p-5 transition-shadow hover:shadow-md"
    >
      {category && (
        <span className="w-fit rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-strong">
          {category.icon} {category.name}
        </span>
      )}
      <h3 className="font-semibold leading-snug">{entry.title}</h3>
      <p className="text-sm text-foreground/60">{entry.short}</p>
    </Link>
  );
}
