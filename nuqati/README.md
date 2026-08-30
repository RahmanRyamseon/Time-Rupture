# Nuqati (نقاطي) — GCC Credit Card Points Optimizer

A Bahrain-first MVP implementation of the *PointsWise GCC / Nuqati* product spec: a
mobile-first tool that helps GCC cardholders decide which card to use for a purchase,
what their accumulated points are really worth, and when to transfer them to an
airline/hotel program.

No bank login is required — everything runs client-side against a curated card
database, with your wallet, spend logs, and points balances kept in `localStorage`.

## Features (Phase 1 MVP)

- **My Wallet** (`/wallet`) — browse and add cards from a curated database of 26
  cards across Bahrain's 11 major issuing banks (NBB, BisB, KFH Bahrain/AUB, BBK,
  Ithmaar, NBK Bahrain, HSBC, Standard Chartered, Citibank, Al Salam Bank, Khaleeji
  Bank), with earn rates by merchant category, annual fees, Islamic/conventional
  flags, and an estimated monthly value.
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

Card data in `src/data/` is a manually curated, illustrative dataset (not a live
bank feed) — see the in-app disclaimer and each card's `lastVerified` date. This
mirrors the spec's own MVP approach: no proprietary bank data or scraping, just
curated public terms, expanded and corrected over time.

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
