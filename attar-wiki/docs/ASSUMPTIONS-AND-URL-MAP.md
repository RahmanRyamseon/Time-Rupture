# Assumptions and URL map

Written before any code. Where the brief was silent I made the choice below; each one is easy to change.

## Assumptions

### Product
1. **Working name.** The site is called "Attar Wiki" until you pick a name. The name is set in one place: `NEXT_PUBLIC_SITE_NAME` (with a fallback in `src/lib/site.ts`).
2. **The repository ships no content.** It contains no attars, houses, notes, regions or prices. Every CSV in `seed/` has a header row and no data rows. Pages show "Not yet documented, help add it" until you import your CSVs or contributors add content. The database migrations include only *spelling variants* used by search (itr / ittar / इत्र → attar). These are search plumbing, not facts.
3. **"Reader" is anyone who is not signed in.** Signing in makes you a *contributor* automatically. An admin promotes people to *editor* or *admin* in `/moderate/users` or with SQL.
4. **Contributors' edits are suggestions.** They go into `edit_suggestions` with status `pending`. When an editor or admin submits an edit, it is approved on the spot. The approval still goes through the same function, so a revision is always written.
5. **Reviews publish immediately.** A report from any signed-in user puts the review in the moderation queue. The review is hidden automatically after 3 distinct reports until an editor decides. A review that contains a link is held for moderation. *(Alternative: send every review to the queue first by changing `REVIEW_DEFAULT_STATUS` in the API.)*
6. **One review per user per attar.** You can edit your own review. Reviews are plain text, 20–1500 characters, with an optional skin type, city and climate.
7. **Every vote uses a 1–5 scale.**
   - Longevity: 1 = under 1 h … 5 = 12 h+.
   - Sillage: 1 = skin scent … 5 = room-filling.
   - Heat, humidity and winter: 1 = performs poorly … 5 = excellent.
   - Pages show the average, the vote count and the distribution. They never show a single editorial score. Averages from fewer than 3 votes are labelled "early data".
8. **Each shelf entry has one status per attar:** own, want or tried. The shelf is cached in `localStorage`, and changes made offline sync when you are back online.
9. **Prices are a separate table, `price_reports`.** Each row holds min/max INR, volume in ml, reported date, source name and source URL. An attar can have many reports. The page shows the latest one and the history. Price filters use the latest report converted to ₹ per 10 ml.
10. **Clones and inspirations can point outside the wiki.** `attar_relations` links to another wiki attar (`related_attar_id`) or names an external fragrance (`external_name`), for example a designer perfume. Relation types: `similar`, `clone_of`, `inspired_by`.
11. **Hindi is available for interface text and optional content fields.** Content has optional `*_hi` columns (`name_hi`, `summary_hi`). When a Hindi field is empty, the English text is shown with a small "English only" label. Long articles are not machine-translated.
12. **Hindi URLs use a prefix.** English URLs have no prefix (`/attars/…`) and Hindi URLs start with `/hi/…`. Both are linked with `hreflang` and canonical tags.
13. **Images.** Uploads go to a Supabase Storage bucket called `media`. The upload must declare a license from an allow-list: CC0, CC BY 4.0, CC BY-SA 4.0, own work released under CC BY-SA 4.0, or brand permission (which requires a permission note). Credit is required. New uploads stay `pending` until an editor approves them. Entities without an approved image show an SVG placeholder illustration.
14. **The matcher ("Find your attar")** has two stages:
   - A rule-based scorer narrows the published catalog to at most 60 candidates.
   - If `ANTHROPIC_API_KEY` is set, Claude re-ranks those candidates. It receives only catalog fields and returns ids plus *which criteria matched*, from a fixed list.
   - Every returned id is checked against the candidate set. If Claude fails, refuses or returns no valid ids, the rule-based ranking is used.
   - The "why" text is generated from database fields, not from model prose, so no unsourced claims reach the page.
15. **"Most-viewed pages lacking data"** uses a daily `page_views` counter, incremented by a beacon from the browser. It stores no IP addresses or user ids.
16. **"Needs citation" is computed.** A documented field (for example `how_made`, `history`, `founded_year`) that has no row in `citations` with that `field_name` gets the flag. Notes, votes and reviews are not flagged because they are community data.

### Technical
17. **Versions:** Next.js 16 (App Router, Turbopack, `proxy.ts` instead of `middleware.ts`), React 19, Tailwind CSS v4, next-intl v4, Serwist (`@serwist/turbopack` route-handler integration), and the Supabase SSR client.
18. **Wiki pages are server-rendered with ISR** (`revalidate = 600`). They are revalidated on demand when an edit is approved. User-specific parts (my votes, my shelf status, the edit button state) load on the client from `/api/v1/*`, so wiki pages stay cacheable and fast.
19. **The API is versioned at `/api/v1`** and is the only data surface a future native app needs. Every route accepts the Supabase session cookie *or* an `Authorization: Bearer <supabase access token>` header, so a Capacitor or React Native app can call it directly.
20. **Search uses a `search_documents` table** that triggers keep up to date. It combines Postgres full-text search (`simple` config plus `unaccent`) with `pg_trgm` word similarity for typo tolerance. A `normalize_search_text()` SQL function maps spelling variants before matching, on both stored documents and queries.
21. **Revisions are written by an `AFTER INSERT OR UPDATE` trigger** on every entity table. Each one is a full JSON snapshot, including notes, relations and the latest price for attars. CSV imports produce revisions too, with the summary "CSV import".
22. **The build must succeed without Supabase credentials** (CI, preview). The data layer then returns empty results and the UI shows empty states.
23. **Placeholder brand mark.** Icons and splash screens are generated from one SVG by a script (`npm run icons`). Replace `public/brand/mark.svg` when you have a logo.

## URL map

`[hi]` = optional `/hi` prefix for Hindi. Every page below exists in both languages.

| URL | Page | Rendering |
|---|---|---|
| `/` | Home: search, featured guides, browse by note, region and family, recently edited | ISR |
| `/attars` | Browse and filter. Query params: `family, type, note, house, region, weather (heat\|humidity\|winter), longevity (min avg), price (₹/10 ml band), sort, page` | Dynamic (SSR) |
| `/attars/[slug]` | Attar page | ISR |
| `/houses`, `/houses/[slug]` | House / distiller | ISR |
| `/notes`, `/notes/[slug]` | Note explorer: an A–Z list, then every attar containing the note, grouped by position | ISR |
| `/regions`, `/regions/[slug]` | Region | ISR |
| `/glossary`, `/glossary/[slug]` | Method and glossary entry | ISR |
| `/guides`, `/guides/[slug]` | Long-form guide with table of contents | ISR |
| `/{section}/[slug]/history` | Revision list (section = attars, houses, notes, regions, glossary, guides) | SSR |
| `/{section}/[slug]/history/[revisionId]` | Field-by-field diff against the previous revision | SSR |
| `/{section}/[slug]/edit` | "Suggest an edit" form (sign-in required) | SSR |
| `/new/[section]` | Propose a new page | SSR |
| `/search?q=` | Search across all content types | SSR |
| `/compare?items=a,b,c,d` | Compare up to 4 attars | SSR |
| `/finder` | "Find your attar" matcher | Static shell + API |
| `/shelf` | My Shelf: own, want, tried (works offline) | Client |
| `/sign-in` | Magic link (and Google if configured) | Static |
| `/account` | Display name, city, my edits, my reviews | SSR |
| `/moderate` | Moderator overview | SSR (editor) |
| `/moderate/edits`, `/moderate/edits/[id]` | Pending edit queue and review | SSR (editor) |
| `/moderate/reviews` | Flagged and held reviews | SSR (editor) |
| `/moderate/media` | Pending image uploads | SSR (editor) |
| `/moderate/citations` | Pages with "needs citation" fields | SSR (editor) |
| `/moderate/gaps` | Most-viewed pages lacking data | SSR (editor) |
| `/moderate/users` | Role management | SSR (admin) |
| `/about`, `/contribute`, `/privacy`, `/terms` | Static editorial pages | Static |
| `/offline` | Offline fallback | Static, precached |

### Non-page routes

| URL | Purpose |
|---|---|
| `/auth/callback` | Supabase OAuth / magic link code exchange |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | SEO and PWA metadata |
| `/serwist/sw.js` | Service worker (built by Serwist) |
| `/api/v1/search` | GET `?q=&type=&limit=` |
| `/api/v1/attars` | GET list with the same filters as `/attars` |
| `/api/v1/attars/[slug]` | GET full attar record |
| `/api/v1/entities/[section]/[slug]` | GET any entity (houses, notes, regions, glossary, guides) |
| `/api/v1/entities/[section]/[slug]/revisions` | GET revision list |
| `/api/v1/revisions/[id]` | GET one snapshot plus the previous one |
| `/api/v1/compare` | GET `?items=` |
| `/api/v1/votes` | GET `?attar=` (my votes) · POST `{attarId, metric, value}` · DELETE |
| `/api/v1/reviews` | GET `?attar=` · POST · PATCH (own) · DELETE (own) |
| `/api/v1/reviews/[id]/report` | POST |
| `/api/v1/shelf` | GET · PUT `{attarId, status}` · DELETE `?attar=` · POST `/sync` batch |
| `/api/v1/edits` | POST suggestion · GET mine |
| `/api/v1/edits/[id]` | POST `{action: approve\|reject, note}` (editor) |
| `/api/v1/media` | POST upload (multipart) · `/api/v1/media/[id]` POST approve/reject (editor) |
| `/api/v1/moderation/reviews/[id]` | POST publish/hide (editor) |
| `/api/v1/moderation/users/[id]` | POST role change (admin) |
| `/api/v1/matcher` | POST `{occasion, weather, vibes[], budget}` |
| `/api/v1/views` | POST `{type, id}` page-view beacon |
| `/api/v1/me` | GET profile and role · PATCH |
