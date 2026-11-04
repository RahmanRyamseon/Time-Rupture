# Cables & Aluminium Market Watch

A static dashboard for Midal Cables that collects, every day, what an aluminium rod, conductor
and cable maker in the GCC needs to know: new grid projects, tenders and awards, competitor moves,
government and utility plans, demand drivers, export markets, the aluminium market and LME prices.

## Sections

| Section | What it shows | Where it comes from |
|---|---|---|
| **Today's brief** | Deal counts for the week and the top awards and tenders, the most active competitors, new government plans, Midal mentions, and a one-line metals summary | Computed from the data below |
| **Deal flow** | Tenders, awards, construction, commissioning and plans from the last 60 days, with value, region and companies | News items, with stage and value read from the headline |
| **Project tracker** | Major grid and power projects with owner, value, scope, parties, why each matters to Midal, and a source | `data/projects.json`, curated by hand |
| **Industry news** | Every item, filterable by 10 categories, region, company and search, with an option to show only items new since your last visit | Collector (below) |
| **Company tracker** | Mentions over the last 30 days and the latest headline for competitors, EPC contractors (conductor buyers), utilities and smelters | Company tags on news items |
| **LME prices** | Aluminium and copper cash price, 3-month price, the gap between them, stocks, the copper/aluminium ratio, charts and a price table | Westmetall's public LME tables |
| **Sources** | Tender portals, utilities, smelters, peers, and how to read the signals | `data/watchlist.json`, curated by hand |

News categories: grid projects & awards, tenders & bids, government & utility plans,
renewables/data centres & demand, competitor moves, aluminium market, copper & LME,
trade & policy, export markets (India, Australia, Africa, Europe, US) and Midal mentions.

## How the collector works

`scripts/update.mjs` (Node 18+, no dependencies):

1. **Prices**: reads the LME official cash, 3-month and stock values for aluminium and copper.
   It keeps about 2 years of history.
2. **News**: runs about 50 Google News searches. These include one per competitor group, utility
   and government searches, and site-specific searches for SaudiGulf Projects, Utilities ME,
   Zawya, Argaam and GCC Tender News. Eight of the searches are in **Arabic**, because Saudi
   awards and Tadawul disclosures often appear there first. It also reads the RSS feeds of
   **SaudiGulf Projects**, **GCC Tender News** and **Utilities Middle East** directly.
3. **Classification**: each item is matched against category rules, tagged with regions and with
   about 60 companies (`COMPANIES`), and given a deal stage and the first money amount in the
   headline. Off-topic items, such as water, sewerage and pipelines with no grid content, are
   dropped. Items are kept for 120 days.

`scripts/test.mjs` checks the parsers, the classifier and the stage and value extraction offline.
The workflow runs it before every collection.

`.github/workflows/cables-market-watch.yml` runs on weekdays at 17:43 UTC (after the LME closes)
and every day at 06:13 UTC, and commits the new data.

### Tuning

- **Add a company**: add a line to `COMPANIES` (name, role, regular expression).
- **Add a topic**: add a query to the right category in `CATEGORIES`. For an Arabic query, use
  `["query", "ar"]`.
- **Add a trade site**: add its RSS feed to `FEEDS`.
- **Add a project**: add an entry to `data/projects.json` with a source link and an `asOf` date.

## Run locally

```bash
node cables-market-watch/scripts/test.mjs
```

```bash
node cables-market-watch/scripts/update.mjs
```

```bash
npx serve cables-market-watch
```

## Hosting

Any static host works. With Vercel, create a project with root directory `cables-market-watch`
(the same setup as `gcc-privacy-watch`). It redeploys each time the workflow commits data.
GitHub runs scheduled workflows only from the default branch, so the daily refresh starts once
this is merged to `master`. To run it by hand, use **Actions → Cables market watch (daily) → Run workflow**.

## Limits

- News is matched by keyword. Some items will be off-topic and some will be missed, and stage and
  value are read from headline wording. Confirm against the source before acting.
- MEED, Argus, Fastmarkets and regional price premiums are paywalled, so they are not collected.
  Etimad and the other tender portals need a login or an API, so they are linked under Sources.
- The project tracker is only as current as its last hand edit. Each card shows its `asOf` date.
- Prices are LME official end-of-day values, not intraday quotes.
- The data in this commit is a seed: LME data from 3 Aug to 3 Nov 2026, 38 verified news items,
  and 14 tracked projects. The first workflow run looks back 30 days and fills the feeds.
