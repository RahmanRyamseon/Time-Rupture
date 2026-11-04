# Cables & Aluminium Market Watch

A static dashboard for Midal Cables that tracks what an aluminium rod, conductor and cable maker
in the GCC needs to follow each day:

- **LME prices**: aluminium and copper cash settlement, 3-month, cash–3M spread and LME
  warehouse stocks, with 1M / 3M / 6M / 1Y charts and a price table.
- **Today's brief**: an auto-generated summary (daily and monthly move, backwardation or contango,
  stock trend, copper/aluminium ratio, how many news items arrived in each category).
- **Industry news** in six categories: projects & tenders (GCC grid, transmission, interconnection),
  cable orders & industry (peers and competitors), aluminium market (Alba, EGA, Ma'aden, premiums,
  rod, smelter supply), copper & metals, trade & policy (tariffs, Section 232, CBAM, anti-dumping)
  and Midal mentions. Each item is tagged by region, and you can search, filter by region, and show
  only items that are new since your last visit.
- **Watchlist**: tender portals, utilities, smelters and competitors, plus notes on how to read
  each signal. Edit `data/watchlist.json` by hand.

## How it works

- `scripts/update.mjs` reads the LME official prices from Westmetall's public tables and runs about
  20 Google News RSS searches. It merges the results into `data/prices.json` (about 2 years) and
  `data/news.json` (90 days). It has no dependencies and runs on Node 18+.
- `scripts/test.mjs` checks the parsers and filters offline.
- `index.html`, `app.js` and `style.css` render the data. There is no build step.
- `.github/workflows/cables-market-watch.yml` runs the collector on weekdays at 17:43 UTC (after
  the LME closes) and every morning at 06:13 UTC (for news), then commits the new data.

To add a topic, add a query to the right category in `CATEGORIES` in `scripts/update.mjs`.

## Run locally

```bash
node cables-market-watch/scripts/update.mjs
```

```bash
npx serve cables-market-watch
```

## Hosting

Any static host works. With Vercel, create a project with root directory `cables-market-watch`
(the same setup as `gcc-privacy-watch`). It redeploys each time the workflow commits new data.
GitHub runs scheduled workflows only from the default branch, so the daily refresh starts once
this is merged to `master`. To run it by hand, use **Actions → Cables market watch (daily) → Run workflow**.

## Limits

- Prices are the LME official end-of-day values, not live intraday quotes. Regional premiums
  (Japan, Rotterdam, US Midwest, Middle East) are paywalled, so they are not charted.
- News items are matched by keyword, so some may be off-topic and some may be missed.
  Google News links go through a `news.google.com` redirect.
- If every source fails, the script exits with an error and keeps the previous data.
- The data shipped in this commit is a seed (LME data 3 Aug – 3 Nov 2026, and 15 news items).
  The first workflow run backfills the full price history and fills the news feed.
