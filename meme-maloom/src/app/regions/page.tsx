import type { Metadata } from "next";
import RegionCard from "@/components/RegionCard";
import { regionInfo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Explore Memes by Region",
  description:
    "Browse Indian memes by region — North, South, East, West, Northeast and Pan-India formats, each mapped to the states and culture behind them.",
};

export default function RegionsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 max-w-2xl">
        <p className="text-xs font-bold tracking-widest text-saffron-600 uppercase">
          Pan-India coverage
        </p>
        <h1 className="font-display mt-1 text-3xl font-extrabold text-navy-900 sm:text-4xl">
          Explore by region
        </h1>
        <p className="mt-2 text-navy-600">
          Meme culture is hyper-local before it&apos;s national. Browse by where
          a format actually comes from.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {regionInfo.map((info) => (
          <RegionCard key={info.region} info={info} />
        ))}
      </div>
    </div>
  );
}
