import Link from "next/link";
import type { RegionInfo } from "@/lib/types";
import { getMemeCountByRegion } from "@/lib/data";

export default function RegionCard({ info }: { info: RegionInfo }) {
  const count = getMemeCountByRegion(info.region);
  return (
    <Link
      href={`/explore?region=${encodeURIComponent(info.region)}`}
      className="group flex flex-col gap-3 rounded-3xl border-2 border-navy-900/10 bg-white p-5 shadow-card transition hover:-translate-y-1 hover:border-mint-400 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-lg font-extrabold text-navy-900">{info.region}</p>
        <span className="shrink-0 rounded-full bg-navy-900/5 px-3 py-1 text-xs font-bold text-navy-700">
          {count} {count === 1 ? "meme" : "memes"}
        </span>
      </div>
      <p className="text-sm text-navy-600">{info.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {info.states.map((s) => (
          <span key={s} className="rounded-full bg-saffron-50 px-2.5 py-1 text-xs font-semibold text-saffron-700">
            {s}
          </span>
        ))}
      </div>
      <span className="mt-1 text-sm font-bold text-mint-600 group-hover:underline">
        Explore {info.region} memes →
      </span>
    </Link>
  );
}
