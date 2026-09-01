# Nuqati Mobile (نقاطي) — Expo / React Native port

A native iOS/Android/web port of [`nuqati`](../nuqati), the Bahrain-first GCC
Credit Card Points Optimizer. Same card database, same rewards engine, same nine
features — this is the mobile shell the original spec's recommended stack called
for, built with Expo Router.

No bank login is required — everything runs on-device against a curated card
database, with your wallet, spend logs, and points balances kept in
`AsyncStorage` (the RN equivalent of the web app's `localStorage`).

## Features

Identical scope to the web app, wired onto native navigation:

- **Home** — feature grid entry point.
- **My Wallet** (Wallet tab) — browse and add cards from the same curated
  30-active/2-legacy Bahrain card database; add/remove, filter by bank, tier,
  Sharia-compliance, and legacy status.
- **Explore Benefits** (Explore tab) — country → bank → card-type filters, plus
  benefit-tag and "points can be used for" (cashback/flights/hotels/merchandise)
  filters, with no wallet required.
- **Smart Swipe Advisor** (Swipe tab) — pick a category and amount, get a live
  ranked list of your wallet's cards by real reward value, with cap-usage bars.
- **Points Valuation Engine** (More → Points Value) — balance-by-program valuation
  across cashback vs. every transfer path.
- **Transfer Partner Navigator** (More → Transfers) — the bank-points → airline/
  hotel transfer map, with a transfer simulator.
- **Statement Import** (More → Statement Import) — pick a CSV file
  (`expo-document-picker` + `expo-file-system`) or paste one, get transaction-level
  real-vs-optimal analysis through the same chronological, cap-aware engine as
  Smart Swipe.
- **Monthly Cheat Sheet** (More → Cheat Sheet) — category → best-card grid for the
  current cycle, plus cap-nearly-exhausted alerts.
- **Fee-ROI Report** (More → Fee-ROI Report) — annualized real earnings vs. annual
  fee, with a Keep / downgrade / cancel verdict.

## Architecture: sharing logic with the web app

`nuqati/src/lib/` and `nuqati/src/data/` are almost entirely platform-agnostic
TypeScript — no DOM, no `next/*`, no `localStorage`. Everything except the web
app's `AppState` context (`store.tsx`, which is built on `useSyncExternalStore` +
`localStorage`) was copied into this app verbatim:

```
src/lib/{types,rewards,format,csv,statement,benefits}.ts
src/data/{cards,loyaltyPrograms,transferPartners,merchantCategories,
          merchantKeywords,countries,spendProfile,benefitTags}.ts
```

The one platform-specific piece, `src/lib/store.tsx`, is a from-scratch
`AsyncStorage`-backed reimplementation of the same `AppState` context —
identical field names and behavior (`cardIds`, `addCard`, `removeCard`,
`logSwipe`, `cycleKey`, `balanceFor`, `statementSummaries`, etc.), just hydrated
asynchronously on mount instead of read synchronously from `localStorage`.

Everything above `lib`/`data` — every screen, every component — is new RN/Expo
code, since React DOM components don't run on native. Screens are 1:1 ports of
the corresponding Next.js pages: same state shape, same calls into `rewards.ts`
/ `statement.ts` / `benefits.ts`, same verdict thresholds — only the JSX
(`View`/`Text`/`Pressable` instead of `div`/`span`/`button`, `Chip` components
instead of `<select>`/checkboxes) and navigation (Expo Router file-based routing
instead of Next.js App Router) differ.

### Styling

NativeWind v4 (`className` on RN primitives, Tailwind config, Metro plugin) with
the same CSS-custom-property palette as the web app's `globals.css` — `global.css`
defines identical light/dark RGB triplets under `:root` and
`@media (prefers-color-scheme: dark)`, consumed via
`rgb(var(--x) / <alpha-value>)` in `tailwind.config.js`.

## Development

```bash
npm install --legacy-peer-deps   # React 19 + Expo SDK 57 peer resolution
npm run web                      # or: npm start / npm run ios / npm run android
npm run lint
npm run typecheck
```

`--legacy-peer-deps` is required throughout — see the peer-dependency note below.

There's no iOS/Android simulator in this environment, so this app was verified
with `expo start --web` (react-native-web) driven by Playwright: every screen
was exercised end-to-end (add/remove wallet cards, Smart Swipe ranking, the
Transfer simulator, CSV paste → auto-categorize → assign card → save to
Fee-ROI → verified the Fee-ROI report and Cheat Sheet both picked up the saved
data) with zero console/page errors. Native iOS/Android builds have not been
run in a simulator or on-device — that verification is still outstanding.

## Not yet built — and why

Same scope gaps as the web app, for the same reason: this session's network
egress is policy-blocked to the aggregator/bank-page domains needed to source
UAE, Saudi Arabia, Qatar, Kuwait, and Oman card data responsibly, so `/explore`
marks those markets "coming soon" and the dataset stays Bahrain-only. See the
web app's README for the full sourcing writeup — the data files are shared
verbatim, so it applies here unchanged.

Additionally, specific to this port:

- **No push notifications for cap alerts.** Same reasoning as the web app (no
  backend to send from) plus Expo push notifications specifically would need a
  registered project/credentials this environment can't set up. The Cheat
  Sheet's in-app cap-alert section is the equivalent.
- **The web app's print-to-PDF cheat sheet button was dropped** — `window.print()`
  isn't a native concept; nothing replaces it yet.

## Stack

Expo SDK 57, Expo Router (file-based routing), React 19, TypeScript, NativeWind 4
/ Tailwind CSS 3, `@react-native-async-storage/async-storage`. No backend — state
lives on-device.
