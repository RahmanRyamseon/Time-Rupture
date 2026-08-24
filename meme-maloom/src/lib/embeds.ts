import type { EmbedType } from "./types";

/**
 * Turns a stored sourceUrl into something safe to render as an embed.
 *
 * This never interpolates the raw sourceUrl into an iframe/script src.
 * Instead it validates the URL is on the platform's real domain, extracts
 * the canonical ID (video ID, post ID, tweet URL), and rebuilds a known-safe
 * embed URL from scratch. If the URL doesn't match a recognised pattern —
 * including "it's just a link to an article that happens to mention a
 * platform" — this returns null and the caller falls back to the
 * illustration + source link. A URL only counts as embeddable if it *is*
 * the canonical platform post/video URL, not merely because that word
 * appears somewhere in it.
 */
export type ParsedEmbed =
  | { kind: "youtube"; embedSrc: string }
  | { kind: "tenor"; postId: string }
  | { kind: "twitter"; canonicalUrl: string }
  | { kind: "instagram"; canonicalUrl: string };

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function parseYouTube(url: string): ParsedEmbed | null {
  const host = safeHost(url);
  if (!host) return null;
  const allowed = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];
  if (!allowed.includes(host)) return null;

  let id: string | null = null;
  try {
    const u = new URL(url);
    if (host === "youtu.be") {
      id = u.pathname.slice(1).split("/")[0] || null;
    } else if (u.pathname.startsWith("/watch")) {
      id = u.searchParams.get("v");
    } else if (u.pathname.startsWith("/shorts/")) {
      id = u.pathname.split("/")[2] || null;
    } else if (u.pathname.startsWith("/embed/")) {
      id = u.pathname.split("/")[2] || null;
    }
  } catch {
    return null;
  }

  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  return { kind: "youtube", embedSrc: `https://www.youtube-nocookie.com/embed/${id}` };
}

function parseTenor(url: string): ParsedEmbed | null {
  const host = safeHost(url);
  if (!host || host !== "tenor.com") return null;

  const match = url.match(/-gif-(\d{6,25})(?:$|[/?#])/);
  const id = match?.[1];
  if (!id) return null;
  return { kind: "tenor", postId: id };
}

function parseTwitter(url: string): ParsedEmbed | null {
  const host = safeHost(url);
  if (!host) return null;
  if (!["twitter.com", "x.com", "www.twitter.com", "www.x.com"].includes(host)) return null;
  if (!/\/status\/\d+/.test(url)) return null;
  return { kind: "twitter", canonicalUrl: url };
}

function parseInstagram(url: string): ParsedEmbed | null {
  const host = safeHost(url);
  if (!host) return null;
  if (!["instagram.com", "www.instagram.com"].includes(host)) return null;
  if (!/\/(p|reel)\/[A-Za-z0-9_-]+/.test(url)) return null;
  return { kind: "instagram", canonicalUrl: url };
}

export function parseEmbed(embedType: EmbedType, sourceUrl: string): ParsedEmbed | null {
  switch (embedType) {
    case "youtube":
      return parseYouTube(sourceUrl);
    case "tenor":
      return parseTenor(sourceUrl);
    case "twitter":
      return parseTwitter(sourceUrl);
    case "instagram":
      return parseInstagram(sourceUrl);
    default:
      return null;
  }
}
