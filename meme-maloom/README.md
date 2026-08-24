# Meme Maloom

**Indian memes, explained.** A Pan-India meme discovery and
cultural-explanation platform — a frontend prototype built with Next.js
(App Router), TypeScript and Tailwind CSS v4.

Meme Maloom is not a meme reposting site. It's built to explain the
origin, language, region and cultural context behind Indian memes across
Hindi/Hinglish, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi,
Gujarati, Punjabi and more.

See [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) for the colour palette,
typography and component structure behind this build.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What's here

- **Homepage** — hero, featured memes, trending, explore by
  language/region, popular categories, newsletter.
- **`/explore`** — search, filter (language/region/category/year/
  popularity/content type) and sort (Trending/Newest/Most Explained/Most
  Shared) over the sample dataset.
- **`/meme/[slug]`** — full meme detail pages: explanation, origin,
  cultural context, translation/transliteration, variations, related
  memes, share buttons, and a report/takedown flow.
- **`/languages`, `/regions`, `/categories`** — browse hubs linking into
  `/explore` with pre-applied filters.
- **`/submit`** — a moderated-submission-style form (client-side demo,
  no backend) with a copyright confirmation and community guidelines
  notice.
- **`/trending`** — a demo analytics dashboard (trending memes, 24h
  growth, language/region/category/source distribution, an engagement
  leaderboard) built from sample data, clearly labelled as such.
- **Legal pages** — `/about`, `/community-guidelines`, `/copyright`,
  `/privacy`, `/contact`, including the platform-affiliation disclaimer.

## Data & media policy

- No third-party images are downloaded or reproduced. Meme media is
  always shown as a labelled placeholder (`PlaceholderMedia`) alongside a
  link to the original source.
- The data model (`src/lib/types.ts`) and sample dataset
  (`src/lib/data.ts`) are structured so a real backend — Reddit/
  Instagram/YouTube ingestion, a moderation queue, a real submissions
  pipeline — can replace the static data file without any page or
  component changes.

### How new entries get added

New dataset entries are added deliberately, in small researched batches —
not scraped or auto-published in bulk. For each entry:

1. Facts (origin date, creator, first-known-usage) are checked against
   at least one independent, citable source (Wikipedia, established news
   coverage) before writing the entry — an entry doesn't get added if it
   can't be verified this way.
2. Only the *explanation and cultural commentary* is original writing.
   No image, video, or audio is downloaded — `sourceUrl` always points
   to where the meme can actually be found, same as the placeholder +
   source-link pattern described above.
3. Entries that can't be corroborated (wrong claimed origin, unclear
   attribution) are left out rather than published with a guess.

This keeps growth rate-limited by actual research, on purpose — each
entry in `src/lib/data.ts` carries its own `sourceUrl` and `creator`
field, so the citation for any given meme is always right next to the
claim it supports.

### Official embeds (opt-in, per entry)

A small number of entries additionally render a **live official embed**
(YouTube, Tenor — X/Instagram support exists in code but isn't in active
use yet) instead of the illustration, when both `embedType` and
`embedAllowed` are set on that entry in `src/lib/data.ts`.

- **What this is:** an iframe or platform widget pointed at the
  platform's own canonical embed endpoint (`youtube-nocookie.com/embed/…`,
  `tenor.com/embed/…`, or X/Instagram's documented `blockquote` + script
  widgets). Nothing is downloaded, cached, proxied, or transformed —
  Meme Maloom never touches the media bytes.
- **How the URL is trusted:** `src/lib/embeds.ts` only recognises a
  canonical platform post/video URL on that platform's real domain
  (extracting the video/post ID and rebuilding the embed URL itself); a
  sourceUrl merely mentioning a platform, or an article that links to one,
  does not qualify. Anything that doesn't parse falls back to the
  illustration automatically.
- **Fallback is automatic and total:** if `embedAllowed` isn't explicitly
  true, the platform/ID can't be parsed, or (at runtime, outside this
  code's control) the underlying post is deleted/private/blocked, nothing
  special has to happen — the page simply shows the illustration + source
  link, which is always present regardless of embed status.
- **Per-entry disable:** flip `embedAllowed: false` on any entry to pull
  its embed immediately without touching anything else. The report form
  on every meme page also includes "Remove the embedded media" as a
  reason, for the same effect via the moderation flow.
- **Not a legal clearance:** using a platform's own embed widget avoids
  copying media and is standard, permitted practice — but it does not
  mean embedding can never raise copyright, privacy, trademark, or
  platform-terms issues in every circumstance. Embeds remain subject to
  the originating platform's own terms of service and availability at all
  times, and can be pulled per-entry as above if a concern is raised.

## Tech

- [Next.js](https://nextjs.org) App Router, TypeScript, Tailwind CSS v4
- No external UI/chart libraries — cards, badges, and dashboard bars are
  hand-built so the whole design system stays in this repo.
- SEO: per-route metadata, Open Graph image generation
  (`opengraph-image.tsx`), `robots.ts`, `sitemap.ts`.

## Disclaimer

Meme Maloom is an independent, fictional platform built for this
prototype. It is not affiliated with, endorsed by, or sponsored by
Reddit, Instagram, YouTube, Know Your Meme, or any other platform
referenced in the UI.
