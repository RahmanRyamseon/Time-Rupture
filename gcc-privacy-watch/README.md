# GCC Data Privacy Watch

A static site that tracks personal data protection and privacy news for the GCC
(Bahrain, Saudi Arabia, UAE, Qatar, Oman, Kuwait), plus Mozambique as a requested extra.
Every item links to the original article, and the page lists the primary laws and regulators.

## How it works

- `scripts/update.mjs` pulls Google News RSS results for a set of queries (per country, plus
  government-domain queries), merges them into `data/updates.json`, and keeps 120 days of items.
  It has no dependencies and runs on Node 18+.
- `data/sources.json` is the curated list of laws and regulators. Edit it by hand.
- `index.html`, `app.js`, `style.css` render both files. There is no build step.
- `.github/workflows/gcc-privacy-watch.yml` runs the collector every day at 03:17 UTC and commits
  the new data. Vercel (project `gcc-privacy-watch`, root directory `gcc-privacy-watch`) rebuilds
  the site on each push to `master`.

## Run locally

```bash
node gcc-privacy-watch/scripts/update.mjs      # refresh data/updates.json
npx serve gcc-privacy-watch                    # or any static file server
```

## Daily refresh

GitHub runs scheduled workflows only from the default branch (`master`), so the daily job runs
from there. To check it by hand, run **Actions → GCC privacy watch (daily) → Run workflow**.

## Limits

- Google News links go through a `news.google.com` redirect. The page also shows the
  publisher's own domain.
- The headlines are matched by keyword, so some items may be off-topic or missed. Sources
  mentioned in the feed are not summarised by AI; the page shows the publisher's snippet.
- Regulator names, dates and enforcement status differ between sources. `sources.json`
  records those conflicts. Confirm against the official text.
- If every feed fails on a run, the script exits with an error and keeps the previous data.
- This is an automated digest, not legal advice.
