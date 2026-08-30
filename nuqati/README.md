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

## Not yet built (later phases, per spec)

Spend tracking against welcome-bonus thresholds, an annual-fee-vs-rewards analyzer,
points expiry push alerts, a card recommendation engine, and an AI points concierge
are Phase 2/3 features from the spec and are out of scope for this MVP.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. No backend —
state lives in the browser.
