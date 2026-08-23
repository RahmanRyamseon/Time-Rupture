import type { Metadata } from "next";
import { Suspense } from "react";
import ExploreClient from "@/components/ExploreClient";
import { GridSkeleton } from "@/components/States";

export const metadata: Metadata = {
  title: "Explore Indian Memes",
  description:
    "Search and filter Indian memes by language, region, category, year, popularity and content type on Meme Maloom.",
};

export default function ExplorePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-bold tracking-widest text-saffron-600 uppercase">
          Browse the archive
        </p>
        <h1 className="font-display mt-1 text-3xl font-extrabold text-navy-900 sm:text-4xl">
          Explore memes
        </h1>
        <p className="mt-2 max-w-2xl text-navy-600">
          Filter by language, region, category, year, popularity or content
          type — or just search for a dialogue you half-remember.
        </p>
      </header>
      <Suspense fallback={<GridSkeleton />}>
        <ExploreClient />
      </Suspense>
    </div>
  );
}
