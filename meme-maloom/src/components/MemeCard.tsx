import Link from "next/link";
import type { Meme } from "@/lib/types";
import PlaceholderMedia from "./PlaceholderMedia";
import Badge from "./Badge";
import { formatCompactNumber } from "@/lib/utils";

export default function MemeCard({ meme }: { meme: Meme }) {
  return (
    <Link
      href={`/meme/${meme.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border-2 border-navy-900/10 bg-white shadow-card transition hover:-translate-y-1 hover:border-navy-900/20 hover:shadow-card-hover"
    >
      <PlaceholderMedia
        label={meme.imagePlaceholderLabel}
        tone={meme.placeholderTone}
        contentType={meme.contentType}
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="saffron">{meme.language}</Badge>
          <Badge tone="navy">{meme.category}</Badge>
        </div>
        <h3 className="font-display text-lg leading-snug font-bold text-navy-900 group-hover:text-saffron-700">
          {meme.title}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-navy-700">{meme.description}</p>
        <div className="flex items-center justify-between border-t border-navy-900/10 pt-3 text-xs font-semibold text-navy-500">
          <span>{meme.region}</span>
          <span className="flex items-center gap-1 text-mint-600">
            ▲ {meme.growth24h}% · {formatCompactNumber(meme.explainViewCount)} explained
          </span>
        </div>
      </div>
    </Link>
  );
}
