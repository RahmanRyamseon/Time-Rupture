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

## Live updates

The site updates in near real time in two layers:

1. **Live endpoint, every ~10 minutes.** `api/live.mjs` is a Vercel serverless function. On
   request it fetches about 27 fast sources in parallel: one search per category, the first
   searches of each market, the five trade feeds, the EU tender database, and today's LME
   official prices. It merges them with the committed history and returns everything as JSON.
   Vercel's CDN caches the response for 10 minutes (`s-maxage=600`), so every visitor gets data
   at most ~10 minutes old, and the sources are hit only a few times an hour however many
   people are viewing. If every source fails, it serves the stored history and retries after
   a minute.
2. **Full crawl, every 3 hours.** The GitHub Action runs all ~120 searches, both tender
   databases and the feeds, and commits `data/news.json` and `data/prices.json`. That is the
   history the live endpoint builds on, and it redeploys the site.

The page loads `/api/live` first and falls back to the committed `data/*.json` snapshot if
the endpoint is unavailable, for example on a plain static server. It re-checks every 10
minutes, and when you return to the tab, and updates every section in place. The header shows
**● Live**, the time of the last check, how many sources answered, and how many items arrived
since you opened the page.

LME prices are the official end-of-day values, published once each trading day. Live intraday
LME quotes need a paid LME data licence.

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
   **Tender databases** (official notices, collected every run):

   | Source | Coverage | Access |
   |---|---|---|
   | TED | EU tenders and awards: power cables, cables, power-line construction CPV codes (3 pages) | Free API, no key |
   | UK Find a Tender | UK tenders and awards (not on TED since Brexit), kept by CPV code or grid title | Free OCDS API, no key |
   | World Bank procurement | Goods and works for World Bank-financed grid projects: Asia, Latin America, Africa, Eastern Europe | Free API, no key |
   | CanadaBuys | Canadian federal tenders, filtered to grid and cable notices | Free open-data CSV |
   | SAM.gov | US federal tenders, e.g. WAPA, BPA and the Army Corps (NAICS 237130 line construction, 335929 energy wire) | Free key (see below) |

   Their stage (Tender, Award or Plan) comes from the notice type.

   **Searches by language**: besides English, searches run in Arabic, French, German, Spanish,
   Portuguese, Italian, Polish, Japanese, Korean, Vietnamese and Indonesian, and in the local
   English editions for the UK, Canada, Australia, Singapore and the Philippines. That way
   regional press is not crowded out by Indian and US outlets.
   awards and Tadawul disclosures often appear there first. It also reads five RSS feeds directly:
   **SaudiGulf Projects**, **GCC Tender News**, **Utilities Middle East**, **offshoreWIND.biz**
   (Europe) and **Electrical Business** (Canada). **AL Circle** (aluminium industry) is read
   directly from its Google News sitemap (titles and exact times, last 48 hours) and its
   press-release sitemap (last 14 days, titles taken from the link). Both are allowed by its
   robots.txt, and stories it also publishes through Google News are merged, keeping the
   direct link.
3. **Classification**: each item is matched against category rules, tagged with regions and with
   about 60 companies (`COMPANIES`), and given a deal stage and the first money amount in the
   headline. Off-topic items, such as water, sewerage and pipelines with no grid content, are
   dropped. Items are kept for 120 days.

`scripts/test.mjs` checks the parsers, the classifier and the stage and value extraction offline.
The workflow runs it before every collection.

`.github/workflows/cables-market-watch.yml` runs every 3 hours, plus weekdays at 17:43 UTC
(right after the LME publishes official prices), and commits the new data.

### Tuning

- **Add a competitor**: add an entry to `data/competitors.json` (name, base, segment, `match`
  regex, `search` query, sources).
- **Add a buyer, utility or smelter**: add a line to `COMPANIES` in `scripts/update.mjs`.
- **Add a market search**: add a query to that market in `MARKETS`.
- **Add a topic**: add a query to the right category in `CATEGORIES`. For an Arabic query, use
  `["query", "ar"]`.
- **Add a trade site**: add its RSS feed to `FEEDS`.
- **Add a project**: add an entry to `data/projects.json` with a source link and an `asOf` date.

## Enabling US federal tenders (SAM.gov)

1. Sign in at [sam.gov](https://sam.gov) (free), open **Account Details**, and request a
   **Public API Key**.
2. In GitHub, go to **Settings → Secrets and variables → Actions → New repository secret**,
   with name `SAM_API_KEY` and the key as the value.

Until a key is set, the run report lists SAM.gov as "not enabled" and everything else runs normally.

## Reliability

The collector is built to run unattended:

- **Retries:** up to two, with exponential backoff, on timeouts, network errors, 429 and 5xx
  (honouring `Retry-After`). A block (401/403/405/410/451) or a 404 is not retried.
- **Pacing:** a random 0.9–1.8 s delay between searches.
- **Checkpoint:** progress is saved to `data/.checkpoint.json` every 10 sources. Ctrl+C or
  SIGTERM finishes the current source and saves before exiting. `--resume` continues a run
  started within the last 6 hours.
- **Atomic writes:** every data file is written to a temp file and then renamed.
- **Logs:** each day goes to `logs/collector-YYYY-MM-DD.log`, alongside the console.
- **Run report:** `data/run-report.json` records every source's status (ok, empty, failed,
  paused, not enabled), item count, timing, HTTP status and error. The dashboard shows it under
  **Sources** as source health.
- **Auto-pause:** a source that blocks us 3 runs in a row is paused and retried once a day. The
  live layer skips feeds that blocked the last crawl.

## Run locally

```bash
node cables-market-watch/scripts/test.mjs
```

```bash
node cables-market-watch/scripts/update.mjs
```

For a long run on your own machine, start it detached in tmux:

```bash
tmux new -d -s cables-crawl 'bash cables-market-watch/scripts/collect.sh'
```

```bash
tmux capture-pane -t cables-crawl -p | tail -20
```

To stop cleanly, use `tmux send-keys -t cables-crawl C-c`. To continue later, pass `--resume`
to `collect.sh`.

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
