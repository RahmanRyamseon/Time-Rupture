# గల్ఫ్ తెలుగు గైడ్ (Gulf Telugu Guide)

Hosted on **Cloudflare** (Worker `time-rupture`, whose free plan allows ads) and, during the move,
on https://gulfteluguguide.vercel.app.

Practical guidance in Telugu for Telugu people going to, living in and returning from the Gulf
(UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain). It isn't a news site: every guide is written
from official sources, links to them, and shows the date it was last checked. The discussion
section is called **🌳 రచ్చబండ** ("మన ముచ్చట్ల వేదిక").

## What readers get

| Section | Address | Content |
|---|---|---|
| వెళ్లే ముందు (Before you go) | `/t/before` | Checking a job offer and agent (eMigrate, ₹30,000 + GST fee cap); ECR clearance and PBBY insurance (₹10 lakh for ₹275/₹375) |
| గల్ఫ్‌లో జీవనం (Living there) | `/t/living`, `/c/<country>` | One page per country: ID card and its portal, labour ministry (UAE 600 590000, Saudi 19911), Indian missions and free helplines, Telugu associations; passport rights |
| సమస్యలో ఉంటే (In trouble) | `/t/trouble` | Unpaid salary (where to complain); a death abroad and bringing the body home (MEA steps, ICWF, Telangana's ₹5 lakh ex gratia) |
| తిరుగు ప్రయాణం (Going home) | `/t/home` | Gratuity rules and a calculator (UAE and Saudi), going-home checklist |
| డబ్బు (Money) | `/t/money` | Sending money safely, NRE and NRO accounts, rupee rates |
| అధికారిక సమాచారం (Official updates) | `/updates` | Links to the official channels for new rules, amnesties and advisories: Indian missions, Gulf labour ministries, MADAD, eMigrate, APNRTS, TOMCOM |
| డైరెక్టరీ | `/sources` | Helplines (tap to call), embassies, services, Telugu associations |
| 🌳 రచ్చబండ | `/board`, and questions under every guide | Moderated discussions |

There are also safety tips in the bar under the menu, India/Gulf clocks, rupee rates, a daily
poll, proverb and word, and legal pages (`/about`, `/terms`, `/privacy`, `/copyright`, `/rules`).

## Editing the content

| File | What it holds |
|---|---|
| `data/guides.json` | Categories, safety tips and the guides. Each guide has `id`, `cat`, `title`, `en`, `summary`, `en_summary`, `html`, `sources` (official links) and `checked` (date last verified). |
| `data/countries.json` | Per-country ID card, residence portal, labour ministry, embassies, notes, and the date checked. |
| `data/sources.json` | Directory: helplines, missions, services, associations. |
| `data/community.json` | Boards, polls, proverbs, words. |
| `data/legal.json`, `data/site.json` | Legal pages, and the contact and grievance-officer details they show. |
| `gratuity.js` | The gratuity rules used by the calculator (UAE Decree-Law 33/2021 Art. 51; Saudi Labor Law Arts 84–85). |

Rules for content:
1. Write from official sources only, and list them in `sources`.
2. Update `checked` each time you re-verify a guide. Re-check every guide at least every 6 months.
3. If a rule can't be confirmed from an official source, link to the source instead of stating it.
4. Run `node scripts/test.mjs`. It checks every guide's fields, sources, dates and internal links,
   the country data, and the gratuity calculations against worked examples.

## How it runs

- Static site: `index.html`, `style.css`, `app.js`, `store.js`, `gratuity.js`, `config.js`.
- On every deploy, Cloudflare Pages (or Vercel, via `vercel.json`) runs `scripts/build-pages.mjs`. It writes a ready-made
  HTML page for every guide, topic, country, board and legal page, plus `sitemap.xml`, so search
  engines can read each address. Old news addresses (`/s/…`, `/story/…`) redirect to the homepage.
- `.github/workflows/telugu-rachabanda.yml` runs daily. It runs the tests, refreshes the rupee rates
  (`scripts/rates.mjs`) and checks the page build.

## Adding a video (reel)

1. Put the MP4 (vertical 1080×1920, under 25 MB) and a poster image in `media/`.
2. Add an entry to `data/videos.json`: `id`, `guide` (the guide it explains), `date`, `title`, `en`,
   `summary`, `file`, `poster`, `duration`, and, once posted, its `youtube` and `instagram` links.
3. Run `node scripts/test.mjs` and push to `master`. The site redeploys and shows the video on the
   home page, on its guide page and at `/videos`.

## Cloudflare hosting

The repository is connected to a Cloudflare Worker named `time-rupture` (Workers & Pages → Connect
to Git). On every push to `master`, Cloudflare runs `npx wrangler deploy`, which reads
`wrangler.jsonc` (in the repository root, or in this folder if the project's root directory is set
to `telugu-rachabanda`). That config runs `scripts/build-pages.mjs` and serves `dist/` as static
assets: `/g/gratuity` is served from `g/gratuity.html`, unknown paths get the app shell, and
`dist/_redirects` and `dist/_headers` handle old links and caching.

Canonical links and the sitemap use the address in `SITE_URL` if set (add it under the Worker's
Settings → Build → Variables, for example `https://gulfteluguguide.com` once you add a custom domain);
otherwise they keep the Vercel address.

## Shared comments

Without a database, questions and comments stay in each reader's browser (the form says so). To
share them, create a free Supabase project, run `supabase/schema.sql`, and put the project URL and
anon key in `config.js`. Moderate from the Supabase table editor.

## Run locally

```bash
node telugu-rachabanda/scripts/test.mjs
node telugu-rachabanda/scripts/build-pages.mjs   # writes telugu-rachabanda/dist/
npx serve telugu-rachabanda/dist
```

## Legal

See [`LEGAL.md`](./LEGAL.md).
