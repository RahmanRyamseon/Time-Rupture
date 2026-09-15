# PF Wiki

An unofficial, searchable reference for Employees' Provident Fund (EPF/PF) problems —
the "PF Wikipedia" gateway: one place to look up a problem (UAN won't activate, a
claim got rejected, an employer never deposited contributions, TDS on withdrawal,
transfer stuck, e-nomination won't save…), see the likely cause, the official fix
path, and the workarounds people report actually worked.

**Not affiliated with EPFO or the Government of India.** See the disclaimer on every
page — always confirm your specific situation on the official
[EPFO Member Portal](https://unifiedportal-mem.epfindia.gov.in/) or with a regional
EPFO office.

## What's here

- **15 problem entries** across 9 categories (UAN activation & login, KYC &
  corrections, claims & withdrawal, PF transfer, employer non-compliance, EPS
  pension, nomination & death claims, tax/TDS, passbook & interest).
- Each entry (`src/data/problems.ts`) has: how the problem shows up, likely causes,
  numbered fix steps, community-sourced "how people actually solved it" tips, an
  official escalation path (EPFiGMS grievance portal, regional office, etc.), and a
  `sources` list of where it was researched from, with a `lastVerified` date.
- **Search** (`/`, `/browse`) — a simple client-side term-match search over titles,
  tags, symptoms, and causes; no backend, so this is fast and free but not
  typo-tolerant.
- **Browse by category** (`/category/[slug]`) and a full **directory** (`/browse`)
  with category filter chips.
- **Official links** (`/official-links`) — the real EPFO portals, grievance system,
  and UMANG app, since this site's job is to explain, not to replace them.

## Data & sourcing

Content in `src/data/problems.ts` was built from a research pass over EPFO's own
published rules plus personal-finance publishers, forums, and social-media reports
of what worked — see each entry's `sources` field. Each entry also cites specific
Reddit threads (mostly r/epfoindia, a subreddit dedicated to EPFO issues) where a
member's real, dated experience matched or added to the official guidance — those
sources are labeled `(r/<subreddit>)` in the title. This is a curated dataset, not a
live feed from EPFO's systems: rules, forms, and processing timelines do change.
`lastVerified` marks when each entry's research pass happened; treat anything older
than a few months as worth re-checking against the official portal, especially
pension and tax-threshold figures.

There is intentionally no user-submission backend yet (no accounts, no database) —
adding new problems or updated fixes means editing `src/data/problems.ts` directly
and citing a source, the same way the existing entries are structured.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. Fully static
content — no backend, no database, no user accounts.
