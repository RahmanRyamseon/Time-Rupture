# مِجمَرة · Mijmara

**موسوعة عربية مجتمعية مستقلة عن العود ودهن العود والمخلّطات والمسك ودهن الورد والبخور.**
An independent, Arabic-first community encyclopedia of oud, dehn al oud, mukhallat, musk, rose oils and bakhoor — every fact linked to its source. Nothing is sold; no affiliate links.

- Next.js 16 (App Router, TypeScript), Tailwind CSS 4 with logical (RTL-safe) utilities
- next-intl: Arabic default at `/`, English at `/en`, Arabic URL segments and slugs, hreflang + canonical on every page
- Installable PWA (Serwist): app shell precached, every visited page cached for offline reading, install prompt, mobile bottom tab bar
- Supabase (optional): auth, votes, reviews, My Collection sync, revisions with full snapshots + diffs, moderation queue, “citation needed” flags, licensed media uploads
- Matcher: Claude ranks **only** encyclopedia entries; every returned id is verified, with a deterministic rule-based fallback
- Versioned read API at `/api/v1/*` for a future native app

## Quick start

```bash
cd mijmara
npm install
npm run dev          # compiles data/csv → src/generated/content.json, then starts on :3000
```

```bash
npm test             # unit tests (normalisation, search, matcher, dataset integrity)
npm run typecheck
npm run build && npm start
```

The site works **with no database**: content comes from the CSV dataset in `data/csv/`, compiled and validated at build time (broken citation/house/note references fail the build). Community features show a clear notice until Supabase is connected.

## Content rules (enforced by tooling and review)

- No fact without a source. Citations are **per field** (`citations` column, see `data/templates/README.md`).
- Empty fields render «لم يُوثَّق بعد — ساهم بإضافته» with a link to contribute.
- Prices are “reported prices”: amount, currency, size, **observation date and source** are mandatory. JSON-LD uses `Article` only — no `Offer`/`Product`.
- No authenticity verdicts without a source. Units (tola/ml/g) are never auto-converted.
- Images: upload requires a licence (own work, CC BY, CC BY-SA, CC0, brand permission) and a credit; hidden until an editor approves.

The seed dataset (10 products, 7 houses, 8 origins, 23 notes, 6 articles, 31 sources) was researched from public web sources on 13 Nov 2026 — official house pages, Wikipedia, Saudi Aramco World, Jafza and specialist guides — and every claim carries its citation.

## Project layout

```
data/csv/            source-of-truth dataset (bilingual, cited)
data/templates/      empty CSV templates + column guide
scripts/             build-content.ts (validate & compile), import-supabase.ts
supabase/migrations/ schema, Arabic search, wiki mechanics, RLS
src/app/[locale]/    pages (internal English folders, localised public paths in src/i18n/routing.ts)
src/app/api/v1/      read API + matcher
src/app/sw.ts        service worker
src/lib/             normalisation, search, matcher, content repository, SEO
```

## URL map

| Page | Arabic | English |
|---|---|---|
| Home | `/` | `/en` |
| Products / product | `/منتجات`, `/منتجات/[slug]` | `/en/products`, `/en/products/[slug]` |
| Category | `/تصنيف/[id]` | `/en/category/[id]` |
| Houses | `/دور-العطور/[slug]` | `/en/houses/[slug]` |
| Origin explorer | `/أصول-العود/[slug]` | `/en/oud-origins/[slug]` |
| Ingredients & notes | `/المكونات/[slug]` | `/en/notes/[slug]` |
| Culture / guides | `/الثقافة/[slug]`, `/أدلة/[slug]` | `/en/culture/[slug]`, `/en/guides/[slug]` |
| Edit / history | `…/[slug]/تحرير`, `…/[slug]/السجل` | `…/[slug]/edit`, `…/[slug]/history` |
| Search, compare, matcher | `/بحث`, `/مقارنة`, `/المرشد` | `/en/search`, `/en/compare`, `/en/matcher` |
| My Collection, contribute | `/مجموعتي`, `/ساهم` | `/en/my-collection`, `/en/contribute` |
| Moderation | `/الإشراف` | `/en/moderation` |

## API (`/api/v1`)

| Endpoint | Notes |
|---|---|
| `GET /products?category=&origin=&house=&occasion=&season=` | filtered list |
| `GET /{products,houses,origins,notes,articles}/{id-or-slug}` | entity + resolved citations |
| `GET /{taxonomy,citations,houses,origins,notes,articles}` | full lists |
| `GET /search?q=&kind=product,house` | Arabic-normalised, transliteration-aware |
| `POST /matcher` `{occasion, season, character, strength, locale}` | `{mode: "ai" \| "rules", results: [{id, reason}]}` |

CORS is open for GET so a native app can reuse it.

## Environment

Copy `.env.example` → `.env.local`. All variables are optional:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | canonical/sitemap host |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | enable accounts, votes, reviews, edits, moderation |
| `SUPABASE_SERVICE_ROLE_KEY` | import script only (never exposed to the browser) |
| `CONTENT_SOURCE=supabase` | read approved content from the database (`export_content()` RPC) instead of the bundled CSV build |
| `ANTHROPIC_API_KEY`, `MATCHER_MODEL` | AI matcher (default `claude-opus-5-5`); without a key the rule-based matcher runs |

## Connecting Supabase

1. Create a project (the Free plan allows two active projects per owner).
2. Apply the migrations: `supabase link --project-ref <ref>` then `supabase db push` (or paste the four files, in order, into the SQL editor).
3. Load the dataset: `npm run import:supabase` (or `npm run import:supabase -- --sql > seed.sql` and run it in the SQL editor). Re-running is safe.
4. Auth → URL configuration: add your site URL; enable Email (magic link) and optionally Google.
5. Make yourself admin: `update profiles set role = 'admin' where id = '<your auth user id>';`
6. Add the env vars on Netlify and redeploy. Set `CONTENT_SOURCE=supabase` once you want approved community edits to go live.

Roles: `reader` (no account), `contributor` (default on sign-up), `editor` (moderation queue, approves revisions/reviews/media), `admin` (everything, role changes).

## Deploying on Netlify (from GitHub)

The repository is a monorepo; this app lives in `mijmara/`.

1. Netlify → **Add new project → Import an existing project → GitHub**, choose this repository.
2. **Base directory:** `mijmara` · **Build command:** `npm run build` · **Publish directory:** `.next` (also set in `mijmara/netlify.toml`). Netlify's Next.js runtime is detected automatically.
3. Choose the branch to deploy, add the environment variables above, deploy. Every push to that branch redeploys.

## Wrapping as a native app later (Capacitor)

The site is API-first, so a native shell can either load the live PWA or a static bundle that calls `/api/v1`.

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init Mijmara com.example.mijmara --web-dir=out
```

- **Hosted mode (simplest):** in `capacitor.config.ts` set `server: { url: "https://<your-site>", cleartext: false }` and ship; offline reading keeps working through the service worker.
- **Bundled mode:** build a static client that reads `/api/v1/*` and copy it into `out/`; then `npx cap add ios && npx cap add android && npx cap sync`.
- Add Sign in with Apple in Supabase before App Store submission; RTL is inherited from `dir="rtl"`.

## Accessibility & performance

Semantic landmarks, skip link, visible focus, 44px touch targets, AA contrast on the dark palette, `aria-live` results, keyboard-operable filters and votes, reduced-motion support. Directional icons mirror in RTL; tables scroll horizontally with a sticky first column. Fonts (IBM Plex Sans Arabic, Amiri) are self-hosted, subset by script and preloaded.

---
مِجمَرة موسوعة مجتمعية مستقلة، غير تابعة لأي علامة تجارية أو دار عطور.
Mijmara is an independent community encyclopedia, not affiliated with any brand.
