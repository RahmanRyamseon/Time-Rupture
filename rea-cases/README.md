# REA Cases

A searchable index of software that AI agents reverse-engineered and rebuilt — and, for
each project, what the evidence actually shows.

"REA" started as [morluto/rea](https://github.com/morluto/rea) (Reverse Engineer
Anything), an MCP server and CLI that lets coding agents inspect native binaries,
Electron apps, .NET assemblies, APKs, firmware and websites without their source code.
The name now also covers the wider wave of agents rebuilding closed software, whether or
not they used REA. Plenty of projects are described as "built with REA"; the point of
this site is that the claim is recorded as a claim, with the check behind it.

## What's here

- **89 cases** across 8 categories (official showcases, games & reconstructions, apps &
  tools, hardware/protocols/drivers, security & evaluations, plugins & integrations,
  guides & research, and the wider wave without confirmed REA). Each has its own page
  with the license, the self-reported status, the app it replaces, caveats, and the
  per-case REA claim check.
- **Evidence tags** on every entry — `REA`, `REA (partial)`, `AI-RE`, `Rebuild`,
  `Manual RE`, `Claim?` — browsable at `/tag/[slug]`. The tag is about what the evidence
  supports, not about quality.
- **Search** (`/`, `/browse`) — client-side, weighted and typo-tolerant
  (`src/lib/search.ts`): a project name or the app it replaces outranks a match buried in
  a footnote, a synonym table maps apps onto projects (`photoshop` → PhotoCraft, `obs` →
  rec-rs) and file types onto platforms (`apk` → android), and a Levenshtein fallback
  means "ghidrra" or "photshop" still finds the right case. When nothing matches exactly
  the UI says so rather than presenting guesses as hits. `/browse/?q=…` is honoured, so
  searches are linkable.
- **`/by-app`** — the index the upstream list calls "find a project by the app it
  replaces", derived from each case's `replaces` field.
- **`/evidence`** — the per-case claim check (README? author's post? official showcase?)
  plus the only two controlled tests anyone has published of whether REA improves
  results. Both found no significant gain, which is the single most useful thing on the
  site.
- **`/new`** — cases by repo creation date, **`/resources`** — REA's official channels,
  peer MCP tools, the other lists tracking this wave, and press.
- **`/legal`** — clean-room claims, scope, commercial tool licensing, service terms, what
  this index won't list, and the fake-download warning.

## Data and provenance

Everything in `src/data/` is derived from the CC0-licensed list
[AIshihzong/awesome-reverse-engineer-anything](https://github.com/AIshihzong/awesome-reverse-engineer-anything)
at commit `641331f` (snapshot 2026-10-29). `UPSTREAM` in `src/lib/site.ts` records the
commit and the dates the upstream link check (2026-10-21) and claim check (2026-10-14)
were run; those dates are shown to readers on every data-bearing page, because the
projects this tracks move weekly.

Deliberately **not** stored: star counts and any other number that changes daily. Reach
figures on the home page are a dated snapshot and labelled as one.

To refresh the data: re-read the upstream README and `docs/`, update `src/data/cases.ts`
(and `resources.ts` / `overview.ts`), then bump `UPSTREAM` in `src/lib/site.ts`. Keep
`tag` and `verification` honest — if nobody has checked, the tag is `Claim?`, not `REA`.

This site is unofficial and not affiliated with morluto/rea, rea.tools, the upstream
list, or any project indexed here.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build   # static export to out/
```

Next.js App Router with `output: "export"`, so the whole site is static HTML. Set
`NEXT_PUBLIC_SITE_URL` to the real domain before a production build — `sitemap.xml`,
`robots.txt`, canonical URLs and Open Graph tags all derive from it, and it defaults to a
placeholder.
