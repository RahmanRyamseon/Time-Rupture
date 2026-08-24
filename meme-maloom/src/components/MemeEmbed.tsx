import Script from "next/script";
import { parseEmbed } from "@/lib/embeds";
import type { EmbedType } from "@/lib/types";

/**
 * Renders an official platform embed (YouTube/Tenor iframe, X/Instagram
 * widget) for a meme entry — never a downloaded/cached/proxied copy of the
 * media. Returns null when the entry isn't opted into embedding or its
 * sourceUrl doesn't match a recognised canonical platform URL; the caller
 * is expected to fall back to PlaceholderMedia in that case.
 */
export default function MemeEmbed({
  embedType,
  embedAllowed,
  sourceUrl,
  title,
  className,
}: {
  embedType?: EmbedType;
  embedAllowed?: boolean;
  sourceUrl: string;
  title: string;
  className?: string;
}) {
  if (!embedAllowed || !embedType) return null;
  const parsed = parseEmbed(embedType, sourceUrl);
  if (!parsed) return null;

  if (parsed.kind === "youtube") {
    return (
      <div className={`relative aspect-video overflow-hidden rounded-2xl bg-navy-950 ${className ?? ""}`}>
        <iframe
          src={parsed.embedSrc}
          title={`${title} — embedded from YouTube`}
          loading="lazy"
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  if (parsed.kind === "tenor") {
    // Tenor's documented official embed: a data-postid div hydrated by
    // their own embed.js — not a raw iframe URL.
    return (
      <div className={`overflow-hidden rounded-2xl bg-navy-950/5 ${className ?? ""}`}>
        <div
          className="tenor-gif-embed"
          data-postid={parsed.postId}
          data-share-method="host"
          data-width="100%"
          data-aspect-ratio="1.7777777777777777"
        >
          <a href={`https://tenor.com/view/${parsed.postId}`}>{title}</a>
        </div>
        <Script src="https://tenor.com/embed.js" strategy="lazyOnload" async />
      </div>
    );
  }

  if (parsed.kind === "twitter") {
    return (
      <div className={className}>
        <blockquote className="twitter-tweet">
          <a href={parsed.canonicalUrl}>{title}</a>
        </blockquote>
        <Script
          src="https://platform.twitter.com/widgets.js"
          strategy="lazyOnload"
          async
        />
      </div>
    );
  }

  // Instagram
  return (
    <div className={className}>
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={parsed.canonicalUrl}
        data-instgrm-version="14"
      >
        <a href={parsed.canonicalUrl}>{title}</a>
      </blockquote>
      <Script src="https://www.instagram.com/embed.js" strategy="lazyOnload" async />
    </div>
  );
}
