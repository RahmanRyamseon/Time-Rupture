# EduRozgar India

A mobile-first Next.js (App Router, TypeScript, Tailwind CSS v4) site for discovering
verified scholarships, government jobs, college admissions, fellowships and skill-development
opportunities across India, with a dedicated Muslim/minority eligibility section and the
legal/eligibility disclaimers required for this kind of platform.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_* (see below); leave the rest blank to start
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

Without `.env.local`, the site still runs — every page falls back to the bundled sample
dataset (`src/lib/data/opportunities.ts`). With it, pages read live data from Supabase.

## What's implemented

- **All pages from the spec**: Home, Scholarships, Government Jobs, College Admissions,
  Muslim & Minority Opportunities, State-wise index + per-state pages, Important Dates
  Calendar (monthly grid, filterable), Opportunity detail pages, Search, Dashboard,
  Articles & Guidance (9 full articles), Admin panel, and legal pages (Reservation &
  Eligibility Disclaimer, About, Privacy).
- **Structured data model** (`src/lib/types.ts`) matching the requested field list
  (`opportunity_type`, `muslim_eligibility` with exact source wording, dates, documents,
  official URLs, verification metadata, etc.).
- **Real, researched data** in `src/lib/data/opportunities.ts` — 14 listings (4 Ministry of
  Minority Affairs / minority scholarships, 1 skill-development scheme, 5 government job
  recruitments, 3 university admissions), each checked against an official notification,
  scheme-guideline PDF, or institutional prospectus on 12 September 2026 (linked as
  `official_notification_url` on every record). Where a fact could only be corroborated
  from secondary sources rather than a primary document, that is stated explicitly in the
  record's `editor_notes` field, along with what should be re-verified and where. This is a
  snapshot, not a live feed — see "Keeping this current" below.
- **Search & filtering**: keyword, state, education level, application status, minority/
  Muslim eligibility, women-only, disability, no-fee, rural/EWS, first-generation learner —
  see `src/components/OpportunityListing.tsx` and `src/lib/helpers.ts`.
- **Muslim/minority handling**: eligibility is a tri-state flag (`explicitly_eligible` /
  `not_stated` / `explicitly_not_eligible`) carrying the *exact* source wording, never a
  guess. Badges read "Officially mentions Muslim eligibility" / "Minority welfare scheme" /
  "Open to all eligible applicants" rather than asserting a percentage or quota.
- **Legal content**: the required disclaimer text is used verbatim on `/disclaimer`, a
  banner appears on every page, and the opportunity detail page shows a redirect warning
  before any official-site or notification link opens (in a confirmation dialog).
- **i18n**: English, Hindi and Urdu dictionaries with a language switcher and automatic
  `dir="rtl"` for Urdu (`src/lib/i18n.ts`, `src/lib/LanguageContext.tsx`). Navigation, hero,
  CTAs and disclaimer copy are translated; long-form content (articles, listing descriptions)
  is English-only for now — translating that is straightforward to extend by following the
  same `t()` pattern.
- **Accessibility**: skip-to-content link, visible focus rings, keyboard-operable menus/
  dialogs, adjustable text size (A+/A-), high-contrast navy/teal/gold palette.
- **SEO**: per-page metadata, `sitemap.ts`, `robots.ts`, canonical URLs on opportunity pages,
  and JSON-LD (`JobPosting` / `EducationalOccupationalProgram`) schema on detail pages.
- **Admin & moderation demo**: `/admin` lets you mark a listing re-verified, archive it,
  see stale/closed listings, review "suggest an opportunity" / "report outdated info"
  submissions (approve/reject), see an audit log, see official-link click counts, and
  export listings to CSV. (Those actions are still `localStorage`-only — see stubbed
  section below. The one exception is the **Verification queue** tab, which is real —
  see next section.)
- **A real database and a daily job that checks official sources for changes** — this is
  the part that answers "how does this stay updated automatically." Details below.

## How daily updates actually work

This was built out because a static file goes stale silently, and a platform whose whole
value is "verified, current information" can't afford that. The design deliberately does
**not** auto-publish anything a scraper detects — see why in "Why nothing auto-publishes."

**Architecture:**

```
Supabase Postgres (project: edurozgar-india, qilvkchratzbbrdvzkkv)
├── opportunities     — canonical listings, publicly readable (RLS: anon SELECT only)
├── source_checks     — one row per watched official URL (notification + application
│                       link per opportunity), with last content hash / status / error
├── review_queue      — things a human should look at (see below); nothing auto-applies
├── audit_log         — every admin action and every daily-job run, timestamped
└── app_secrets       — service-role-only; holds the pg_cron → edge function shared secret

supabase/functions/daily-source-check/   — Deno edge function
  1. Fetches every enabled source_checks.url with a real browser User-Agent
     (a plain custom UA gets 403'd by several .gov.in sites' bot protection —
     confirmed empirically while building this).
  2. Hashes the response body (SHA-256) and compares to the stored hash.
  3. If the hash changed, the link is broken/unreachable, or an opportunity's
     next_verification_date has arrived → inserts one row into review_queue.
     It never touches `opportunities` itself.
  4. Logs a summary to audit_log.

supabase/migrations/   — schema, seed data, and the pg_cron schedule (03:17 UTC daily),
                          all version-controlled and safe to commit (no secrets — the
                          cron job reads its auth secret from app_secrets at run time).
```

**Why nothing auto-publishes:** a content hash changing tells you a government page is
*different* — it doesn't tell you *which field* changed, whether the change is material,
or what the new correct value is. Several of this project's own "broken link" findings
during testing turned out to be bot-protection false positives, not real outages. Treating
a hash diff as ground truth and silently overwriting a listing is exactly the failure mode
this platform's own disclaimers warn users about. So the job flags; a human (via `/admin` →
Verification queue, or directly in Supabase) confirms and edits.

**Verified working, live:** the schema, the edge function, and the pg_cron schedule were
all applied and manually invoked end-to-end during development (not just written and
assumed to work) — see the commit history / development notes for the actual run output
(28 sources checked, review_queue populated, audit_log written). The one thing *not*
independently verified from this sandbox is the Next.js app's live read path, because this
specific sandboxed environment's network egress doesn't reach `*.supabase.co` (confirmed —
`curl`, `next build`'s server-side fetches, and even a headless browser all hang/fail
against it here). The data-access layer (`src/lib/opportunities-data.ts`) is written to
degrade gracefully in exactly that situation — catch the failure and fall back to the
bundled sample data — and that fallback itself was verified working. On a normal host
(Vercel, your own machine, etc.) with ordinary internet access, the same code path reaches
Supabase directly instead.

**To see it yourself once deployed somewhere with normal network access:**
1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already filled in
   `.env.example` — safe to commit, they're the public/anon key by design) and the site
   reads live data.
2. Set `SUPABASE_SERVICE_ROLE_KEY` (from the Supabase dashboard → Project Settings → API —
   never commit this) and `ADMIN_API_TOKEN` (any random string) to make `/admin`'s
   Verification queue tab work.
3. Watch `public.review_queue` fill up daily, or trigger a run immediately:
   ```sql
   select net.http_post(
     url := 'https://qilvkchratzbbrdvzkkv.supabase.co/functions/v1/daily-source-check',
     headers := jsonb_build_object('x-cron-secret', (select value from app_secrets where id='cron_secret')),
     body := '{}'::jsonb, timeout_milliseconds := 300000
   );
   ```

## Keeping this current

The 14 listings are real, but a government-scheme aggregator is only as good as its last
check. Before treating any listing as current:

- Read its `editor_notes` field — every record says which facts came from a primary
  document (an official PDF/notice, quoted in `source_excerpt`) versus which were only
  corroborated from secondary education-news sites, and exactly what to re-verify.
- Click through to `official_notification_url` yourself. Application windows, vacancy
  counts and exam dates on real portals change (some already did mid-research —
  SSC CGL's window was reopened once via its own corrigendum).
- Two categories have no listings yet: `fellowship` (the one obvious central candidate,
  the Maulana Azad National Fellowship, was confirmed discontinued in 2023 during
  research — it's deliberately left out rather than listed as if still open) and most
  state-level opportunities beyond West Bengal's Aikyashree scheme.
- `scholarships.gov.in/All-Scholarships` categorises the Ministry of Minority Affairs
  pre-matric/post-matric schemes under a tab this research pass couldn't isolate
  (it renders "Central Sector Schemes" by default); their closing dates here are inferred
  from the identical pattern shown by every other pre/post-matric welfare scheme on that
  page for AY2026-27, not read off a Minority Affairs-specific row — flagged in their
  `editor_notes`.

## What's intentionally stubbed (needs real infra before launch)

The database and daily update pipeline are real (see above). Still missing before this is
production-ready:

1. **Authentication.** `/admin` has no login — anyone with the URL and the shared
   `ADMIN_API_TOKEN` can act. Archive/mark-verified/submissions still persist only to that
   browser's `localStorage`, not Supabase, so they don't survive a different browser or a
   cleared cache. Add real auth (roles: editor/admin), move those actions to the same
   service-role-backed API-route pattern the Verification queue already uses, and add
   server-side authorization before deploying.
2. **Alert delivery.** Dashboard alert preferences (email/mobile, deadline reminders,
   state/minority alerts) are saved locally only — no email/SMS is ever sent. Wire up a
   transactional email/SMS provider and a scheduled job for the 30/7/1-day reminders,
   probably as a second Supabase Edge Function + `pg_cron` job alongside the existing one.
3. **Submission moderation queue for user reports.** "Suggest an opportunity" / "Report
   outdated info" on opportunity detail pages still write to `localStorage`
   (`src/lib/adminStore.ts`) rather than `review_queue` — wiring those through the same
   `/api/admin/review-queue` pattern (reason: `user_report` / `user_suggestion`, already
   modeled in the schema) is a small, natural next step.
4. **Verification workflow (screenshots/archival).** The schema has fields for this
   (`source_excerpt`, `last_verified_date`, etc.) but there's no archival/screenshot
   pipeline — that needs server-side storage (e.g. Supabase Storage) wired into the daily
   job or the admin review flow.
5. **PDF-aware change detection.** The daily job hashes raw response bytes — good enough to
   notice "this changed," but it can't tell you a PDF's *text* changed vs. its metadata, or
   extract the new date/eligibility text itself. A more capable version would parse PDF text
   (or call a scraping service) and diff *that*, not just bytes.

## Design decisions worth knowing

- `src/lib/opportunities-data.ts` is the single data-access point every page uses
  (`getAllOpportunities`, `getOpportunityById`). It tries Supabase first, falls back to
  `src/lib/data/opportunities.ts` on any error (including thrown network exceptions, not
  just Supabase's own `{error}` responses — that distinction mattered in testing), and
  caches successful reads for 60s. Swap the data source in exactly one place if that
  changes later.
- Filtering is client-side (`OpportunityListing` is a client component) over a full
  in-memory dataset — fine at this scale; a real dataset should filter/paginate server-side.
- Listings and dashboard "saved opportunities" use `localStorage`, not accounts, per the
  requirement to avoid collecting unnecessary personal data.
- The site never collects religion; Muslim/minority *eligibility of an opportunity* is
  shown, not asked of the user.
