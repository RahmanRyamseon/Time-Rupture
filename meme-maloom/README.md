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
