# Nuqati (نقاطي) — GCC Credit Card Points Optimizer

A Bahrain-first MVP implementation of the *PointsWise GCC / Nuqati* product spec: a
mobile-first tool that helps GCC cardholders decide which card to use for a purchase,
what their accumulated points are really worth, and when to transfer them to an
airline/hotel program.

No bank login is required — everything runs client-side against a curated card
database, with your wallet, spend logs, and points balances kept in `localStorage`.

## Features (Phase 1 MVP)

- **My Wallet** (`/wallet`) — browse and add cards from a curated database of 30
  active cards (plus 2 legacy/discontinued, shown behind a toggle) across 11 Bahrain
  issuing entities: NBB, BisB, BBK, CrediMax (BBK's card-issuing arm), KFH Bahrain
  (formerly Ahli United Bank), NBK Bahrain, HSBC, Standard Chartered, Al Salam Bank,
  and Khaleeji Bank. Ithmaar Bank's cards are marked legacy — its retail portfolio
  was migrated into Al Salam Bank in 2022. Each card shows earn rates by merchant
  category, annual fees, Islamic/conventional flags, and an estimated monthly value.
- **Smart Swipe Advisor** (`/swipe`) — pick a merchant category and spend amount to
  instantly rank your wallet's cards by real reward value.
- **Points Valuation Engine** (`/points`) — enter your balance for each loyalty
  program in your wallet to see its value as cashback vs. every transfer option.
- **Transfer Partner Navigator** (`/transfers`) — the bank-points → airline/hotel
  transfer map (Falconflyer, AlFursan, Shukran), plus a transfer simulator.
- **Explore Benefits** (`/explore`) — browse full benefits by country → bank → card
  type without adding anything to a wallet; country is a first-class filter (all 6
  GCC markets), with Bahrain live and the rest marked "coming soon".
- **Statement Import** (`/statement`) — upload a bank-statement CSV (or paste one)
  and get transaction-level analysis: each purchase is auto-categorized, then run
  chronologically through the same cap-aware engine as Smart Swipe to show what the
  assigned card actually earned versus what the best card in your wallet would have
  earned at that exact point in the cycle — true marginal optimization, not an
  average-spend estimate.
- **Monthly Cheat Sheet** (`/cheatsheet`) — a category → best-card grid for the
  current cycle (printable), plus a "cap nearly exhausted" section for any wallet
  card approaching its monthly bonus cap.
- **Fee-ROI Report** (`/fee-roi`) — annualizes the rewards actually earned from
  imported statements per card and weighs them against that card's annual fee, with
  a Keep / Consider downgrading / Consider cancelling verdict.

### Multi-country and multi-currency

`Card.fxFeePct` models a card's foreign-transaction fee (sourced for BBK's 2.75%;
statement analysis falls back to an estimated 2.5% GCC-typical fee for cards that
don't publish one) and is netted out of a transaction's earned value when a
statement row is flagged foreign-currency. Full multi-country support (KSA, UAE,
Qatar, Kuwait, Oman card data) is intentionally not populated — see "Not yet built"
below for why.

### Reward caps & the "restart" mechanic

Many Bahrain cards pay a bonus rate on a category only up to a monthly spend cap.
Smart Swipe tracks usage against that cap per billing cycle (`YYYY-MM`, stored in
`localStorage`); once it's used up, the affected card's rate drops to its base rate
in the rankings. The cap **automatically becomes available again** the moment the
calendar rolls into the next month — no explicit "restart" action is needed, it's
just a new cycle key.

## Data

Card data in `src/data/` is a manually curated dataset (not a live bank feed) — see
the in-app disclaimer and each card's `lastVerified` date. This mirrors the spec's
own MVP approach: no proprietary bank data or scraping, just curated public terms,
expanded and corrected over time.

A research pass over published bank pages and T&Cs (BisB Rewards, CrediMax's
Thameen Loyalty program, NBK Rewards, Standard Chartered, BBK, Al Salam Bank,
Khaleeji Bank, and the Points by NBB app) grounds a meaningful share of the
dataset — those fields are tagged "(sourced)" in a card's `keyBenefits`, e.g.:

- BisB's actual per-category point rates and its tiered cashback conversion
  (8/9/10 fils/point depending on redemption size)
- The real BisB → Saudia AlFursan ratio (1,000 BisB Points = 650 AlFursan Miles)
- CrediMax's Thameen Loyalty tiers and its real per-card monthly cashback caps
  (e.g. the talabat Credit Card's 30%-capped-at-BHD-20/month dining cashback,
  used as the primary example for the cap-restart mechanic below)
- NBK's and NBB's flat (non-category-boosted) earning structures
- That Ithmaar Bank's card portfolio was migrated into Al Salam Bank in 2022

Everything else — most annual fees, minimum salaries, and MCC-level bonus rates
not tagged "(sourced)" — is estimated, since most Bahrain issuers don't publish
category-level rates. Citibank Bahrain was removed from the dataset: it does not
appear in this research pass as an active Bahrain card issuer.

## Not yet built — and why

Two things are structurally blocked in this environment rather than merely
unscheduled:

- **Card data for UAE, Saudi Arabia, Qatar, Kuwait, and Oman.** Populating these
  responsibly requires the same research pass Bahrain got (see Data, above) —
  official sources, bank pages, and aggregators like YallaCompare, SAMA's card list,
  Amwal, Bonokey, Giraffy, Buzdy, Mustafeed, and Kwakeb. This session's network
  egress is policy-blocked to those domains, so rather than fabricate rates for five
  more markets, `/explore` marks them "coming soon" and the dataset stays
  Bahrain-only until that data can be sourced (uploaded documents work fine, as the
  Bahrain research pass itself was).
- **Real-time push/SMS cap alerts.** Nuqati is a static client-side app with no
  backend, cron, or notification service — there's nothing to send a push from. The
  Monthly Cheat Sheet's in-app "cap nearly exhausted" banner is the closest
  equivalent available without adding server infrastructure.

Spend tracking against welcome-bonus thresholds, points expiry push alerts, a card
recommendation engine, and an AI points concierge remain unscheduled Phase 2/3 ideas
from the original spec.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. No backend —
state lives in the browser.
