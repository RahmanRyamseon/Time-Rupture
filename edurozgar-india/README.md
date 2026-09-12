# EduRozgar India

A mobile-first Next.js (App Router, TypeScript, Tailwind CSS v4) site for discovering
verified scholarships, government jobs, college admissions, fellowships and skill-development
opportunities across India, with a dedicated Muslim/minority eligibility section and the
legal/eligibility disclaimers required for this kind of platform.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

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
  export listings to CSV.

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

This build has **no backend** — nothing here should be treated as production-ready without
the following:

1. **Database.** All opportunity/article data is static TypeScript in `src/lib/data/`.
   A real deployment needs a database (e.g. via the Supabase MCP connector already
   available in this environment) with the schema in `src/lib/types.ts` as a starting
   point, plus a real editorial workflow — including a scheduled recheck against
   `next_verification_date` — instead of a static file that goes stale silently.
2. **Authentication.** The Admin panel has no login — anyone with the URL can use it. It
   currently persists changes only in that browser's `localStorage` as a UI demo. Add
   real auth (roles: editor/admin) and server-side authorization before deploying.
3. **Alert delivery.** Dashboard alert preferences (email/mobile, deadline reminders,
   state/minority alerts) are saved locally only — no email/SMS is ever sent. Wire up a
   transactional email/SMS provider and a scheduled job for the 30/7/1-day reminders.
4. **Submission moderation queue.** "Suggest an opportunity" / "Report outdated info" write
   to `localStorage` so the admin demo has something to approve/reject; a production
   version needs a server endpoint and persistent storage instead.
5. **Verification workflow (screenshots/archival).** The schema has fields for this
   (`source_excerpt`, `last_verified_date`, etc.) but there's no archival/screenshot
   pipeline — that needs server-side storage.

## Design decisions worth knowing

- Filtering is client-side (`OpportunityListing` is a client component) over a full
  in-memory dataset — fine at this scale; a real dataset should filter/paginate server-side.
- Listings and dashboard "saved opportunities" use `localStorage`, not accounts, per the
  requirement to avoid collecting unnecessary personal data.
- The site never collects religion; Muslim/minority *eligibility of an opportunity* is
  shown, not asked of the user.
