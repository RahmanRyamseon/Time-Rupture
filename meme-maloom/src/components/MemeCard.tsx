import Link from "next/link";
import type { Meme } from "@/lib/types";
import PlaceholderMedia from "./PlaceholderMedia";
import MemeEmbed from "./MemeEmbed";
import UploadedMedia from "./UploadedMedia";
import Badge from "./Badge";
import { parseEmbed } from "@/lib/embeds";
import { formatCompactNumber, tiltFromId } from "@/lib/utils";

export default function MemeCard({ meme }: { meme: Meme }) {
  const tilt = tiltFromId(meme.id);

  // Card-grid embeds are kept to fixed-aspect formats (YouTube video preview,
  // Tenor GIF) so the grid stays uniform — X/Instagram embeds vary too much
  // in height for a card and are only shown on the full meme detail page.
  const canEmbedInCard =
    (meme.embedType === "youtube" || meme.embedType === "tenor") &&
    meme.embedAllowed &&
    Boolean(parseEmbed(meme.embedType, meme.sourceUrl));
  const hasUploadedMedia = Boolean(meme.imageUrl && meme.uploadedMediaKind);

  // The media area always carries its own real, visible link to the source
  // (an official embed's own on-platform link, or — for illustrations — a
  // direct linkHref to sourceUrl) so a card is never shown with unattributed
  // media. That means the media area can't be nested inside the card's own
  // Link to the detail page (no nested <a>), so it sits alongside it instead.
  return (
    <div
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
      className="group flex rotate-[var(--tilt)] flex-col gap-3 rounded-[28px] border border-navy-900/8 bg-white p-2.5 shadow-card transition duration-300 hover:-translate-y-2 hover:rotate-0 hover:shadow-card-hover"
    >
      <div className="relative">
        {canEmbedInCard ? (
          <div className="overflow-hidden rounded-[28px]">
            <MemeEmbed
              embedType={meme.embedType}
              embedAllowed={meme.embedAllowed}
              sourceUrl={meme.sourceUrl}
              title={meme.title}
              className="aspect-video"
            />
          </div>
        ) : hasUploadedMedia ? (
          <UploadedMedia
            src={meme.imageUrl as string}
            kind={meme.uploadedMediaKind as "image" | "video"}
            title={meme.title}
            sourceUrl={meme.sourceUrl}
            sourcePlatform={meme.sourcePlatform}
            className="aspect-video"
          />
        ) : (
          <PlaceholderMedia
            label={meme.imagePlaceholderLabel}
            tone={meme.placeholderTone}
            contentType={meme.contentType}
            icon={meme.illustrationIcon}
            category={meme.category}
            linkHref={meme.sourceUrl}
          />
        )}
        {canEmbedInCard ? (
          <span className="glass-dark pointer-events-none absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
            Real {meme.embedType === "youtube" ? "video" : "GIF"} · {meme.sourcePlatform}
          </span>
        ) : null}
        {canEmbedInCard ? (
          <a
            href={meme.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-dark absolute right-2 bottom-2 rounded-full px-2.5 py-1 text-[10px] font-bold text-white transition-transform hover:scale-105"
          >
            Open on {meme.sourcePlatform} ↗
          </a>
        ) : null}
      </div>
      <Link href={`/meme/${meme.slug}`} className="flex flex-1 flex-col gap-3 px-2 pb-2">
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
      </Link>
    </div>
  );
}
