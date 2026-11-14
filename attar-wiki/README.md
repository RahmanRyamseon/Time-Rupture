# Attar Wiki (working name)

The open, community-written encyclopedia of attars and perfume oils for India and South Asia. It is a wiki, not a shop: nothing is sold, there are no carts and no affiliate links. Prices appear only as dated, sourced *reported ranges*.

- **Reference pages** for attars, houses and distillers, notes, regions, methods and glossary terms, and long-form guides.
- **Wiki mechanics** on every page: last-edited date, full revision history with diffs, numbered footnote citations, "needs citation" flags, "Suggest an edit", and a moderation queue.
- **Community data:** votes on longevity, sillage and heat, humidity and winter performance (averages, counts and distributions, never a single score); short reviews with skin type and climate; report abuse.
- **Tools:** typo-tolerant search that understands attar, itr, ittar and Hindi spellings; filters; compare up to 4 attars; a note explorer; "Find your attar" (Claude re-ranks catalog data only, with a rule-based fallback); My Shelf, which works offline.
- **Installable PWA** with offline reading of every page you have opened, a mobile tab bar, and an install prompt. **English and Hindi.**

The name is a placeholder. Set `NEXT_PUBLIC_SITE_NAME` to rename the site everywhere.

> Read [`docs/ASSUMPTIONS-AND-URL-MAP.md`](docs/ASSUMPTIONS-AND-URL-MAP.md) first. It lists every product decision made where the brief was silent, plus the full page and API URL map.

---

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript |
| Styling | Tailwind CSS v4, Fraunces (display) and Inter (body), system Devanagari fonts for Hindi |
| Data | Supabase: Postgres, Auth (magic link and optional Google), Storage |
| i18n | next-intl (`/` English, `/hi/…` Hindi, hreflang alternates) |
| PWA | Serwist (`@serwist/turbopack`), web app manifest, iOS splash screens |
| AI | Anthropic Claude (`claude-opus-5-5`, structured output) for the optional matcher re-ranking |
| Hosting | Vercel |

## Repository layout

```
attar-wiki/
├── docs/ASSUMPTIONS-AND-URL-MAP.md
├── messages/{en,hi}.json             UI strings
├── public/{brand,icons,splash}/      logo mark, PWA icons, iOS splash screens
├── scripts/
│   ├── generate-icons.mjs            npm run icons
│   └── import/{run,schemas}.ts       npm run import (CSV → Supabase)
├── seed/                             CSV templates (headers only) and README
├── supabase/
│   ├── migrations/                   schema, functions, search, RLS, browse
│   └── tests/                        stub + behaviour tests (plain Postgres)
├── src/
│   ├── app/[locale]/…                pages (see the URL map)
│   ├── app/api/v1/…                  typed route handlers (the only data API)
│   ├── app/sw.ts                     service worker source
│   ├── components/                   wiki, attar, edit, moderation, layout
│   ├── i18n/                         next-intl routing
│   ├── lib/                          data layer, matcher, sections registry, Supabase clients
│   └── proxy.ts                      locale routing and Supabase session refresh
└── tests/unit.test.ts                matcher, footnotes, slugify
```

## Data model (Supabase)

`regions`, `houses`, `notes`, `attars`, `attar_notes` (position: top, heart or base), `attar_relations` (similar, clone_of or inspired_by, internal or external), `price_reports`, `glossary`, `guides`, `citations` (url, title, accessed_at, field_name, entity), `media` (license, credit, status), `revisions` (full JSON snapshot of every change), `edit_suggestions`, `votes` and the trigger-maintained `attar_vote_stats`, `reviews`, `review_reports`, `shelf_items`, `page_views`, `search_documents` and `search_synonyms`, plus `profiles` with roles (reader, contributor, editor, admin).

Row-level security is enabled on every table. Contributors cannot write content directly: edits go through `edit_suggestions`, and an editor applies them with `approve_edit_suggestion()`. That function only accepts whitelisted columns and writes a revision credited to the contributor. Votes and the shelf are private to each user; only aggregates are public.

---

## Local development

Prerequisites: Node 20.9+ and a Supabase project (cloud, or the Supabase CLI with Docker for local).

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, then apply the migrations. With the Supabase CLI:

```bash
npx supabase link --project-ref YOUR-PROJECT-REF
```

```bash
npx supabase db push
```

Or paste each file in `supabase/migrations/` into the SQL editor, in filename order. Then start the app:

```bash
npm run dev
```

The app runs without Supabase credentials too: every page renders its empty state. This is useful for UI work and CI.

### Checks

```bash
npm run typecheck   # next typegen + tsc
```

```bash
npm run lint
```

```bash
npm test            # unit tests (node:test)
```

```bash
PGHOST=/tmp PGPORT=5432 PGUSER=postgres npm run test:db   # migrations + behaviour tests on any local Postgres 15+
```

`test:db` runs on plain Postgres. `supabase/tests/supabase_stub.sql` stands in for Supabase's `auth` and `storage` schemas and roles, then the tests cover RLS, revisions, search (itr/ittar, Hindi aliases, typos), votes, review moderation, edit approval and browse filters.

### Importing content

The repository ships **no content**: every CSV in `seed/` is a header-only template. Fill them from vetted sources (see [`seed/README.md`](seed/README.md)), then:

```bash
npm run import -- all --dry-run
```

```bash
SUPABASE_SERVICE_ROLE_KEY=... npm run import -- all
```

### First admin

Sign in once through the site, then in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
```

After that, admins promote editors from `/moderate/users`.

---

## Deploying to Vercel

1. **Supabase**
   - Create a project in the Mumbai region (`ap-south-1`) for low latency in India.
   - Apply the migrations.
   - In *Authentication → URL Configuration*, set the Site URL to your domain and add `https://YOUR-DOMAIN/auth/callback` to the redirect URLs.
   - Optional: enable the Google provider and set `NEXT_PUBLIC_AUTH_GOOGLE=true`.
   - Customise the magic-link email template with your site name.
2. **Vercel**
   - Import the repository and set **Root Directory** to `attar-wiki`. The framework preset is detected as Next.js.
   - Add environment variables: `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL` (your production URL, no trailing slash), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `ANTHROPIC_API_KEY` and `NEXT_PUBLIC_AUTH_GOOGLE`.
   - **Do not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel. The web app never needs it; only the import script uses it, from your machine or CI.
   - Set the Function Region to `bom1` (Mumbai) to sit next to the database.
3. **Deploy.** Wiki pages are server-rendered and cached with ISR for 10 minutes. Approved edits, votes and moderation actions revalidate the affected pages immediately.
4. **After deploying,** submit `https://YOUR-DOMAIN/sitemap.xml` in Google Search Console. `robots.txt` blocks indexing on preview deployments automatically.

### Caching and freshness

| What | How |
|---|---|
| Wiki pages | ISR (`revalidate = 600`) plus `revalidatePath` on approval, vote, review or moderation |
| Public API | `s-maxage=300, stale-while-revalidate` |
| Private API | `no-store` |
| Service worker | network-first for pages and the GET API (30-day offline copy); stale-while-revalidate for images; `/offline` precached |

---

## Building native apps with Capacitor (later)

The site is API-first: every read and write goes through `/api/v1/*`, and every route also accepts `Authorization: Bearer <supabase access token>`. A native shell can reuse it unchanged. The simplest path is Capacitor wrapping the live site, so updates ship without app-store releases.

1. Install Capacitor in a separate folder (for example `attar-wiki-app/`) or in this one:

   ```bash
   npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   ```

   ```bash
   npx cap init "Attar Wiki" org.attarwiki.app --web-dir public
   ```

2. Point the app at the deployed site in `capacitor.config.ts`:

   ```ts
   import type { CapacitorConfig } from "@capacitor/cli";
   const config: CapacitorConfig = {
     appId: "org.attarwiki.app",
     appName: "Attar Wiki",
     webDir: "public",
     server: { url: "https://YOUR-DOMAIN", cleartext: false },
     android: { allowMixedContent: false },
   };
   export default config;
   ```

3. Add the platforms and open the native projects:

   ```bash
   npx cap add android
   ```

   ```bash
   npx cap add ios
   ```

   ```bash
   npx cap open android
   ```

4. **Auth deep links.** Add `org.attarwiki.app://auth/callback` to the Supabase redirect URLs. Use `@capacitor/app`'s `appUrlOpen` listener to forward the code to `/auth/callback`, or sign in natively with `supabase.auth.signInWithOtp` and call the API with the bearer token.
5. **Icons and splash screens.** Run `npx @capacitor/assets generate --assetPath public/brand`, which uses `mark.svg`.
6. **Store notes.**
   - Google Play accepts PWA-style apps. Alternatively, ship a Trusted Web Activity with Bubblewrap using the existing manifest.
   - Apple expects app-like value beyond the website. The offline shelf, compare tool and matcher help; consider native share and a home-screen widget.
7. **Fully offline native builds.** For these, build a native client (React Native or Capacitor plus a static SPA) against `/api/v1`. The API already returns complete page data (for example `GET /api/v1/attars/{slug}`).

---

## Content and legal rules (enforced in code)

- **No invented facts.** Empty fields render "Not yet documented, help add it". The matcher only shows reasons built from database fields, and Claude only re-ranks catalog ids, which are then verified against the database.
- **Original text.** Contributors are told not to copy text. Sources are linked as citations, and outbound reference links are `nofollow`.
- **Images.** An image needs an allow-listed license, a credit and editor approval. Brand images need a permission note. Without an approved image, the page shows an original SVG placeholder.
- **Prices.** Prices are `price_reports` rows with a date and source. There are no buy buttons, carts or affiliate links; only the official house website is linked.
- **Footer.** Every page carries the independence and non-affiliation statement and the patch-test warning.
