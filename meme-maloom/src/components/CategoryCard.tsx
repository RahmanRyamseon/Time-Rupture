import Link from "next/link";
import type { Category, CategoryInfo } from "@/lib/types";
import { getMemeCountByCategory } from "@/lib/data";

const CATEGORY_BG: Record<Category, string> = {
  Bollywood: "bg-gradient-to-br from-saffron-300 to-pink-400",
  Cricket: "bg-gradient-to-br from-mint-300 to-violet-400",
  Politics: "bg-gradient-to-br from-navy-600 to-violet-600",
  "College Life": "bg-gradient-to-br from-pink-300 to-violet-400",
  "Office Life": "bg-gradient-to-br from-navy-400 to-navy-700",
  Relationships: "bg-gradient-to-br from-pink-300 to-saffron-300",
  Food: "bg-gradient-to-br from-saffron-300 to-mint-300",
  Festivals: "bg-gradient-to-br from-lime-300 to-mint-400",
  Gaming: "bg-gradient-to-br from-violet-400 to-navy-700",
  "Internet Slang": "bg-gradient-to-br from-saffron-300 to-violet-400",
};

export default function CategoryCard({ info }: { info: CategoryInfo }) {
  const count = getMemeCountByCategory(info.category);
  return (
    <Link
      href={`/explore?category=${encodeURIComponent(info.category)}`}
      className="group flex flex-col items-start gap-2 rounded-[28px] border border-navy-900/8 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1.5 hover:rotate-1 hover:shadow-card-hover"
    >
      <span
        className={`hover-wiggle inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-inner ${CATEGORY_BG[info.category]}`}
      >
        {info.emoji}
      </span>
      <p className="font-display text-base font-bold text-navy-900">{info.category}</p>
      <p className="text-xs text-navy-500">{info.description}</p>
      <span className="mt-auto pt-2 text-xs font-bold text-violet-700">
        {count} {count === 1 ? "meme" : "memes"} →
      </span>
    </Link>
  );
}
