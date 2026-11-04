# Cables & Aluminium Market Watch

A static dashboard for Midal Cables that collects, every day, what an aluminium rod, conductor
and cable maker in the GCC needs to know: new grid projects, tenders and awards, competitor moves,
government and utility plans, demand drivers, export markets, the aluminium market and LME prices.

## Sections

| Section | What it shows | Where it comes from |
|---|---|---|
| **Market selector** | Middle East, Asia, Africa, Europe, Canada, USA, Latin America, Oceania — filters every section below | Market tags on news and projects |
| **Today's brief** | Deal counts for the week and the top awards and tenders, the most active competitors, new government plans, Midal mentions, and a one-line metals summary | Computed from the data below |
| **Deal flow** | Tenders, awards, construction, commissioning and plans from the last 60 days, with value, region and companies | News items, with stage and value read from the headline |
| **Project tracker** | 28 major grid and power projects across all eight markets, with owner, value, scope, parties, why each matters to Midal, and a source | `data/projects.json`, curated by hand from web research |
| **Competitors** | 33 rod, conductor and cable makers with base, segment, news mentions over 30 days, the latest headline, and the market research that named them. Below the table: other companies seen winning cable or conductor work that are not on the list yet | `data/competitors.json`, built from web searches; news matches |
| **Industry news** | Every item, filterable by 10 categories, region, company and search, with an option to show only items new since your last visit | Collector (below) |
| **Buyers & utilities** | Mentions over the last 30 days and the latest headline for EPC contractors (conductor buyers), utilities and smelters | Company tags on news items |
| **LME prices** | Aluminium and copper cash price, 3-month price, the gap between them, stocks, the copper/aluminium ratio, charts and a price table | Westmetall's public LME tables |
| **Sources** | Tender portals, utilities, smelters, peers, and how to read the signals | `data/watchlist.json`, curated by hand |

News categories: grid projects & awards, tenders & bids, government & utility plans,
renewables/data centres & demand, competitor moves, aluminium market, copper & LME,
trade & policy and Midal mentions. Every item is also tagged with its market and country/region.

### Where the competitor list comes from

`data/competitors.json` was built from web searches on 4 Nov 2026. These were market reports on
overhead conductors, aluminium wire rod and Middle East cables (Strategic Market Research,
Stratview, SkyQuest, Research Nester, Grand View, Global Insight, TechSci, Research & Markets,
Fortune Business Insights), AlCircle's ranking of Middle East wire rod makers, and news of
contract wins. Each entry lists the pages that named it. The collector runs one news search per
competitor from this file. When a headline names an untracked company as the winner of cable or
conductor work, it appears under the competitor table so you can decide whether to add it.

## How the collector works

`scripts/update.mjs` (Node 18+, no dependencies):

1. **Prices**: reads the LME official cash, 3-month and stock values for aluminium and copper.
   It keeps about 2 years of history.
2. **News**: runs about 120 Google News searches. These include one per competitor, project
   searches for each of the eight markets (`MARKETS`), GCC utility and government searches, and
   site-specific searches for SaudiGulf Projects, Utilities ME, Zawya, Argaam, GCC Tender News,
   Global Transmission Report, reNEWS, Energy Live News and Daily Commercial News. Europe has
   14 searches (UK, Western, Nordic and Eastern European grid operators, interconnectors,
   EU grid policy, cable plants), including German and French ones. Canada has 11 searches
   (provincial utilities, OEB/AESO/IESO approvals, interties, federal funding), including
   French-Canadian ones.
   **Tender databases**: the EU's TED API (power cables, cables, power-line construction CPV
   codes) and CanadaBuys' daily open-data CSV of federal tenders, filtered for grid and cable
   notices. Their stage (Tender or Award) comes from the notice type. Eight of the searches are in **Arabic**, because Saudi
   awards and Tadawul disclosures often appear there first. It also reads five RSS feeds directly:
   **SaudiGulf Projects**, **GCC Tender News**, **Utilities Middle East**, **offshoreWIND.biz**
   (Europe) and **Electrical Business** (Canada).
3. **Classification**: each item is matched against category rules, tagged with regions and with
   about 60 companies (`COMPANIES`), and given a deal stage and the first money amount in the
   headline. Off-topic items, such as water, sewerage and pipelines with no grid content, are
   dropped. Items are kept for 120 days.

`scripts/test.mjs` checks the parsers, the classifier and the stage and value extraction offline.
The workflow runs it before every collection.

`.github/workflows/cables-market-watch.yml` runs on weekdays at 17:43 UTC (after the LME closes)
and every day at 06:13 UTC, and commits the new data.

### Tuning

- **Add a competitor**: add an entry to `data/competitors.json` (name, base, segment, `match`
  regex, `search` query, sources).
- **Add a buyer, utility or smelter**: add a line to `COMPANIES` in `scripts/update.mjs`.
- **Add a market search**: add a query to that market in `MARKETS`.
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
- The TED and CanadaBuys readers follow the publicly documented formats, but they had not been
  run live when this was written. If a format differs, the run logs the reason (for CanadaBuys,
  the CSV headers it found) and carries on without that source. Check the first workflow log.
- Market tags come from place names, so a headline that mentions a contractor's nationality
  (for example "China's Sinohydro") also gets that market.
- The data in this commit is a seed: LME data from 3 Aug to 3 Nov 2026, 41 verified news items,
  and 38 tracked projects (6 in Europe, 7 in Canada). The first workflow run looks back 30 days and fills the feeds.
