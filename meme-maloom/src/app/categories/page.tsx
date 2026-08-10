import type { Metadata } from "next";
import CategoryCard from "@/components/CategoryCard";
import { categoryInfo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Popular Meme Categories",
  description:
    "Browse Indian memes by category — Bollywood, Cricket, Politics, College Life, Office Life, Relationships, Food, Festivals, Gaming and Internet Slang.",
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-bold tracking-widest text-saffron-600 uppercase">
          Pick a vibe
        </p>
        <h1 className="font-display mt-1 text-3xl font-extrabold text-navy-900 sm:text-4xl">
          Popular categories
        </h1>
        <p className="mt-2 text-navy-600">
          Browse by what the meme is actually about, from office standups to
          festival food comas.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categoryInfo.map((info) => (
          <CategoryCard key={info.category} info={info} />
        ))}
      </div>
    </div>
  );
}
