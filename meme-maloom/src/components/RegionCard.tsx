import Link from "next/link";
import type { RegionInfo } from "@/lib/types";
import { getMemeCountByRegion } from "@/lib/data";

export default function RegionCard({ info }: { info: RegionInfo }) {
  const count = getMemeCountByRegion(info.region);
  return (
    <Link
      href={`/explore?region=${encodeURIComponent(info.region)}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-[28px] border border-navy-900/8 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-card-hover"
    >
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br from-mint-400/0 to-violet-400/0 blur-2xl transition-all duration-500 group-hover:from-mint-400/25 group-hover:to-violet-400/25"
      />
      <div className="relative flex items-start justify-between gap-3">
        <p className="font-display text-lg font-bold text-navy-900">{info.region}</p>
        <span className="shrink-0 rounded-full bg-navy-900/5 px-3 py-1 text-xs font-bold text-navy-700">
          {count} {count === 1 ? "meme" : "memes"}
        </span>
      </div>
      <p className="relative text-sm text-navy-600">{info.description}</p>
      <div className="relative flex flex-wrap gap-1.5">
        {info.states.map((s) => (
          <span key={s} className="rounded-full bg-saffron-50 px-2.5 py-1 text-xs font-semibold text-saffron-700">
            {s}
          </span>
        ))}
      </div>
      <span className="relative mt-1 text-sm font-bold text-mint-600 group-hover:underline">
        Explore {info.region} memes →
      </span>
    </Link>
  );
}
