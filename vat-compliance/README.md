# VAT Compliance — Bahrain

A Bahrain VAT (Decree-Law 48/2018) compliance verification workpaper: load AP/AR
`.xlsx` registers, get a per-line verdict against a deterministic rule engine
plus an AI semantic classification pass, map results to VAT return boxes, and
track the Capital Assets Adjustment Scheme.

This is a real Next.js app with Supabase-backed auth and per-user data,
built from an uploaded UI mockup (`VAT_Compliance_Tool.dc.html`) as the spec.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Supabase Auth (email + password) and Postgres with Row Level Security
- Claude API (`@anthropic-ai/sdk`) for the Rate-vs-Nature semantic classification pass, called server-side only
- `xlsx` (SheetJS) for client-side spreadsheet parsing — nothing is uploaded to a server

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required env vars (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from the Supabase project settings. Safe to expose to the browser; access control is enforced by RLS, not by keeping this key secret.
- `ANTHROPIC_API_KEY` — server-only, used by `src/app/api/classify/route.ts`.

## Database

Schema and RLS policies live in `supabase/migrations/0001_init.sql`. Apply it
with the Supabase CLI (`supabase db push`) or paste it into the SQL Editor.

To make an account admin, add its email to `admin_allowlist` **before** it
signs up (a trigger promotes matching signups to `role = 'admin'` on
`profiles`):

```sql
insert into admin_allowlist (email) values ('someone@example.com');
```

Admins get a read-all RLS policy on `workpapers`/`profiles` (see the "Admin —
All Workpapers" page) — everyone else can only ever see their own rows.

## Security notes

- Every table is protected by Postgres RLS — the app never uses a
  service-role/elevated Supabase client, so a route-handler bug can leak at
  most what Postgres itself would allow.
- The `ANTHROPIC_API_KEY` never reaches the browser; classification runs
  through `/api/classify`, which is auth-gated and rate-limited.
- Security headers (CSP, HSTS, X-Frame-Options, etc.) are set in
  `next.config.ts`.
- VAT return box numbers/labels in `src/lib/vat/returnBoxes.ts` and the
  blocked-input/zero-rated keyword lists in `src/lib/vat/rules.ts` are
  illustrative starting points, not a verbatim reproduction of NBR's
  published lists — have a human reviewer confirm classification before
  relying on this tool's verdicts for an actual filing.
