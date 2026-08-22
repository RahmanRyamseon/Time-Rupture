# Meme Maloom — Design System

A short reference for the visual language and component structure behind
this prototype.

## Brand direction

Meme Maloom positions itself as a **cultural archive + trend-discovery
platform**, not a meme reposting site. Every design decision reinforces
"explained," not "reposted": labelled media placeholders, source-link
cards, translation/transliteration blocks, and a sticker-forward but
editorial tone rather than a raw meme-dump feed.

## Colour palette

| Token | Hex | Use |
| --- | --- | --- |
| `saffron-500` | `#ff8a00` | Primary brand colour — CTAs, links, highlights |
| `navy-900` / `navy-950` | `#0a1224` / `#060a18` | Headings, footer, dark surfaces |
| `pink-500` | `#e8447e` | Secondary accent — submit CTA, alerts, report actions |
| `mint-500` | `#14b98c` | Growth/success — trending indicators, positive states |
| `cream` | `#fffaf1` | Page background (warm off-white, not stark government-white) |

Saffron, navy and white nod to Indian visual culture without reaching for
tricolour/government iconography — no Ashoka Chakra, no official seals, no
saffron-white-green banding. Pink and mint exist specifically so the
palette reads as "youthful internet platform" rather than "official
notice board."

Full 50–900 scales for saffron and navy live in `src/app/globals.css`
under `@theme`, so every shade is available as a Tailwind utility
(`bg-saffron-100`, `text-navy-700`, etc).

## Typography

- **Display / headings** — [Baloo 2](https://fonts.google.com/specimen/Baloo+2),
  a rounded, playful variable font that also covers Devanagari, keeping
  headline energy consistent across scripts.
- **Body** — [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans)
  for Latin text, paired with **Noto Sans Devanagari** so Hindi words
  (script snippets, transliterations) render natively instead of falling
  back to a mismatched system font.
- Other Indian scripts (Tamil, Telugu, Malayalam, Kannada, Bengali,
  Gujarati, Punjabi) fall back to the platform's installed system fonts,
  which cover these scripts reliably on modern OSes/browsers — a
  production build would add the matching Noto Sans script family per
  language as usage data justifies the extra font weight.

## Componentry

- **Sticker-style placeholders** (`PlaceholderMedia`) — a gradient card
  with a diagonal stripe pattern, a hand-drawn-style outline icon, and a
  visible "Placeholder" chip. This is the single most important
  component in the system: it's what lets the prototype show "a meme"
  without ever mirroring copyrighted media.
- **Rounded cards everywhere** — `rounded-3xl` + 2px borders + a soft
  `shadow-card` (defined in `globals.css`) is the base card treatment
  used by `MemeCard`, `LanguageCard`, `RegionCard`, `CategoryCard`, and
  most content panels, so the grid always reads as one system.
- **Badges** (`Badge`) — pill-shaped, tonal (saffron/navy/pink/mint),
  used for language/region/category/content-type tags throughout.
- **Bars, not fake pie charts** (`StatBar`) — the Trending dashboard uses
  simple horizontal bars for distributions instead of chart libraries,
  keeping the dependency footprint at zero while staying readable and
  accessible (no colour-only encoding; labels and numbers are always
  shown).

## Layout structure

```
src/app/                 route segments (App Router)
  layout.tsx              root shell: fonts, metadata, Header/Footer
  page.tsx                homepage
  explore/                search + filter + sort
  meme/[slug]/             meme detail (generateStaticParams + generateMetadata)
  languages/ regions/ categories/   index/browse pages
  submit/                 submission form
  trending/               demo analytics dashboard
  about/ community-guidelines/ copyright/ privacy/ contact/  legal & policy pages
  robots.ts sitemap.ts opengraph-image.tsx   SEO plumbing

src/components/          shared, reusable UI (cards, forms, states, nav)
src/lib/
  types.ts                the Meme data model + controlled vocabularies
  data.ts                 sample dataset (growing; see below) + query helpers
  utils.ts                formatting/utility helpers
```

## Data model → future backend

`src/lib/types.ts` defines `Meme`, `LanguageInfo`, `RegionInfo`, and
`CategoryInfo` as the contract every page consumes. `src/lib/data.ts`
implements that contract with static sample data and a handful of query
functions (`getMemeBySlug`, `getTrendingMemes`, `getEngagementLeaderboard`,
etc). Swapping this file for real fetch calls (Reddit/Instagram/YouTube
ingestion → moderation queue → published entries) would not require
touching any page or component, since everything consumes the typed
helper functions rather than the raw array.

## Accessibility notes

- All interactive controls are real `<button>`/`<a>`/form elements with
  visible focus rings (`:focus-visible` in `globals.css`).
- Colour is never the only signal — badges and stat bars always pair
  colour with text/numbers.
- Search, filters and sort are fully keyboard-operable native form
  controls.
- Loading, empty and error states are explicit components
  (`GridSkeleton`, `EmptyState`, `ErrorState`) rather than blank screens.
