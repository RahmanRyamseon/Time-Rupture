import Link from "next/link";
import type { CategoryInfo } from "@/lib/types";
import { getMemeCountByCategory } from "@/lib/data";

export default function CategoryCard({ info }: { info: CategoryInfo }) {
  const count = getMemeCountByCategory(info.category);
  return (
    <Link
      href={`/explore?category=${encodeURIComponent(info.category)}`}
      className="group flex flex-col items-start gap-2 rounded-3xl border-2 border-navy-900/10 bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-pink-400 hover:shadow-card-hover"
    >
      <span className="hover-wiggle inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900/5 text-2xl">
        {info.emoji}
      </span>
      <p className="font-display text-base font-extrabold text-navy-900">{info.category}</p>
      <p className="text-xs text-navy-500">{info.description}</p>
      <span className="mt-auto pt-2 text-xs font-bold text-pink-600">
        {count} {count === 1 ? "meme" : "memes"} →
      </span>
    </Link>
  );
}
