import Link from "next/link";
import type { Meme } from "@/lib/types";
import PlaceholderMedia from "./PlaceholderMedia";
import Badge from "./Badge";
import { formatCompactNumber, tiltFromId } from "@/lib/utils";

export default function MemeCard({ meme }: { meme: Meme }) {
  const tilt = tiltFromId(meme.id);

  return (
    <Link
      href={`/meme/${meme.slug}`}
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
      className="group flex rotate-[var(--tilt)] flex-col gap-3 rounded-[28px] border border-navy-900/8 bg-white p-2.5 shadow-card transition duration-300 hover:-translate-y-2 hover:rotate-0 hover:shadow-card-hover"
    >
      <PlaceholderMedia
        label={meme.imagePlaceholderLabel}
        tone={meme.placeholderTone}
        contentType={meme.contentType}
        icon={meme.illustrationIcon}
        category={meme.category}
      />
      <div className="flex flex-1 flex-col gap-3 px-2 pb-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="saffron">{meme.language}</Badge>
          <Badge tone="violet">{meme.category}</Badge>
        </div>
        <h3 className="font-display text-lg leading-snug font-bold text-navy-900 transition-colors group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-pink-600 group-hover:bg-clip-text">
          {meme.title}
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-navy-600">{meme.description}</p>
        <div className="flex items-center justify-between border-t border-navy-900/8 pt-3 text-xs font-bold text-navy-500">
          <span>{meme.region}</span>
          <span className="flex items-center gap-1 text-mint-600">
            ▲ {meme.growth24h}% · {formatCompactNumber(meme.explainViewCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}
