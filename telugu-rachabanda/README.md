# రచ్చబండ (Rachabanda) — తెలుగు వార్తలు, మన ముచ్చట్లు

A Telugu-language news and community site. *Rachabanda* is the platform under the village tree
where people gather to talk: the site is a newspaper and that common spot in one place.

## What readers get

- **News from every Telugu paper in one place**: Eenadu, Sakshi, Andhra Jyothy, Namasthe
  Telangana, V6 Velugu, BBC Telugu, NTV, TV9, ABP Desam, Samayam and many more, in 14 sections:
  ముఖ్యాంశాలు, ఆంధ్రప్రదేశ్, తెలంగాణ, జాతీయం, అంతర్జాతీయం, సినిమా, క్రీడలు, వాణిజ్యం,
  టెక్నాలజీ, ఆరోగ్యం, విద్య-ఉద్యోగాలు, వ్యవసాయం, భక్తి, ప్రవాసం. Each story links to the
  original article and lists the same story in other papers ("ఇదే వార్త ఇతర పత్రికల్లో").
- **Comments on every story**: name and home town, threaded replies, likes, sort by
  old/new/most liked, and a 🚩 report button (three reports hide a comment).
- **Reactions** on every story (👍 ❤️ 😂 😮 😢 😡), with counts shown on the cards.
- **రచ్చబండ boards**: eight discussion boards — general chat, *మా ఊరి వార్తలు* (readers report
  their own town's news), politics, cinema, sports, literature & poems, recipes, and a help desk.
- **Daily features**: poll of the day, proverb of the day (సామెత), Telugu word of the day,
  latest discussions, most-discussed stories, breaking-news ticker.
- **Resources page**: 43 Telugu newspapers, TV channels, digital outlets, government portals
  (APPSC, TGPSC, TTD, IMD) and literature sites.
- WhatsApp sharing, save-for-later, search, dark mode, larger text (అ+) for older readers,
  mobile-first layout, Telugu dates via `Intl` (`te-IN`).

## How it works

Static site, no build step: `index.html`, `style.css`, `app.js`, `store.js`, `config.js`.

| File | Purpose |
|---|---|
| `scripts/update.mjs` | Pulls Telugu Google News RSS feeds per section into `data/news.json` (keeps 5 days, 80 per section). No dependencies, Node 18+. |
| `scripts/test.mjs` | Offline checks for the parser and merge. |
| `data/sources.json` | Curated list of Telugu news and reference sites. Edit by hand. |
| `data/community.json` | Proverbs, words, polls and discussion boards. Edit by hand; they rotate daily. |
| `store.js` | Comments, reactions and polls. Uses Supabase when configured, otherwise the reader's browser. |
| `supabase/schema.sql` | Tables, row-level security and functions for the shared comments. |
| `../.github/workflows/telugu-rachabanda.yml` | Refreshes the news every 2 hours and commits it. |

## Turning on shared comments

Without a database, comments, reactions and votes are kept only in each reader's browser
(the comment form says so). To make them shared by everyone:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/schema.sql` and run it.
3. Copy the project URL and the anon/publishable key (**Project Settings → API**) into
   `config.js`. Both are meant to be public; the database only allows reading, adding comments,
   and the like/report/react/vote functions. Nobody can edit or delete through the site.
4. Moderate from the Supabase table editor: delete rows from `comments`, or set `reports` to 3
   or more to hide one.

## Run locally

```bash
node telugu-rachabanda/scripts/test.mjs
node telugu-rachabanda/scripts/update.mjs     # refresh data/news.json
npx serve telugu-rachabanda                   # or any static file server
```

## Deploy

Any static host works. On Vercel, create a project with root directory `telugu-rachabanda`; the
workflow's commits redeploy it with fresh news. GitHub runs scheduled workflows only from the
default branch, so the 2-hourly refresh starts once this is merged to `master`.

## Limits

- Headlines come through Google News, so story links go via `news.google.com` to the paper.
- There is no login. Anyone can comment under any name; moderation is the report button plus
  the Supabase dashboard. Add Supabase Auth or a captcha if spam becomes a problem.
- Section placement comes from the feed each story was found in, not from reading the article.
