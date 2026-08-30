import type { LoyaltyProgram } from "@/lib/types";

/**
 * Loyalty program data. Where a source is noted "(sourced)" the figures come from
 * a curated research pass over published bank pages / T&Cs (BisB Rewards page,
 * CrediMax Thameen Loyalty page, NBK Rewards, etc. — see nuqati/README.md).
 * Everything else is an estimate — banks in Bahrain rarely publish a fixed
 * points-to-cash conversion rate for transfer partners, so those values are
 * illustrative unless marked otherwise.
 */
export const LOYALTY_PROGRAMS: LoyaltyProgram[] = [
  {
    id: "gulf-air-falconflyer",
    name: "Gulf Air Falconflyer",
    nameAr: "فالكون فلاير",
    currencyName: "Falconflyer Miles",
    operator: "Gulf Air",
    expiryPolicy: "Miles expire after 36 months of account inactivity",
    minRedemption: "~6,000 miles for a BAH–LHR/BKK economy award",
    redemptionOptions: [
      { type: "flight", label: "Economy flight redemption", valuePerPointFils: 15, conditions: "Estimated — regional/short-haul economy awards" },
      { type: "flight", label: "Business class redemption", valuePerPointFils: 25, conditions: "Estimated — long-haul business class, typically the best value" },
    ],
  },
  {
    id: "saudia-alfursan",
    name: "Saudia AlFursan",
    nameAr: "الفرسان",
    currencyName: "AlFursan Miles",
    operator: "Saudia",
    expiryPolicy: "Miles expire after 3 years of inactivity",
    redemptionOptions: [
      { type: "flight", label: "Domestic Saudi flight", valuePerPointFils: 19, conditions: "Estimated" },
      { type: "flight", label: "Regional/international flight", valuePerPointFils: 30, conditions: "Estimated" },
    ],
  },
  {
    id: "etihad-guest",
    name: "Etihad Guest",
    currencyName: "Etihad Guest Miles",
    operator: "Etihad Airways",
    expiryPolicy: "Miles expire after 24 months of account inactivity",
    redemptionOptions: [
      { type: "flight", label: "Economy/partner redemption", valuePerPointFils: 14, conditions: "Estimated" },
      { type: "flight", label: "Business class redemption", valuePerPointFils: 22, conditions: "Estimated" },
    ],
  },
  {
    id: "avios",
    name: "Avios",
    currencyName: "Avios",
    operator: "British Airways & Qatar Airways Privilege Club (shared IAG currency)",
    expiryPolicy: "Avios expire after 24–36 months of account inactivity depending on issuer",
    redemptionOptions: [
      { type: "flight", label: "Short-haul reward flight", valuePerPointFils: 16, conditions: "Estimated" },
      { type: "flight", label: "Long-haul premium redemption", valuePerPointFils: 28, conditions: "Estimated" },
    ],
  },
  {
    id: "landmark-shukran",
    name: "Landmark Shukran",
    nameAr: "شكراً",
    currencyName: "Shukran Points",
    operator: "Landmark Group",
    expiryPolicy: "Points expire 12 months from date earned if account inactive",
    redemptionOptions: [
      { type: "merchandise", label: "In-store redemption (Centrepoint, Splash, Home Centre)", valuePerPointFils: 5, conditions: "Estimated" },
    ],
  },
  {
    id: "accor-all",
    name: "ALL – Accor Live Limitless",
    currencyName: "Accor Reward Points",
    operator: "Accor Hotels",
    expiryPolicy: "Points expire after 24 months of inactivity",
    redemptionOptions: [{ type: "hotel", label: "Hotel night redemption", valuePerPointFils: 2, conditions: "Estimated" }],
  },
  {
    id: "turkish-miles-smiles",
    name: "Turkish Airlines Miles&Smiles",
    currencyName: "Miles&Smiles Miles",
    operator: "Turkish Airlines",
    expiryPolicy: "Miles expire after 36 months",
    redemptionOptions: [{ type: "flight", label: "Flight redemption", valuePerPointFils: 15, conditions: "Estimated" }],
  },
  {
    id: "flynas-nasmiles",
    name: "flynas naSmiles",
    currencyName: "naSmiles Miles",
    operator: "flynas",
    expiryPolicy: "Miles expire after 24 months of inactivity",
    redemptionOptions: [{ type: "flight", label: "Flight redemption", valuePerPointFils: 12, conditions: "Estimated" }],
  },
  {
    id: "airasia-points",
    name: "AirAsia Points",
    currencyName: "AirAsia Points",
    operator: "AirAsia",
    expiryPolicy: "Points expire after 36 months",
    redemptionOptions: [{ type: "flight", label: "Flight redemption", valuePerPointFils: 10, conditions: "Estimated" }],
  },
  {
    id: "radisson-rewards",
    name: "Radisson Rewards",
    currencyName: "Radisson Reward Points",
    operator: "Radisson Hotel Group",
    expiryPolicy: "Points expire after 24 months of inactivity",
    redemptionOptions: [{ type: "hotel", label: "Hotel night redemption", valuePerPointFils: 2, conditions: "Estimated" }],
  },
  {
    id: "bisb-rewards",
    name: "BisB Rewards",
    nameAr: "مكافآت البحرين الإسلامي",
    currencyName: "BisB Points",
    operator: "Bahrain Islamic Bank",
    expiryPolicy: "Points do not expire while the card remains active",
    minRedemption: "5,000 points minimum; statement cashback capped at 100,000 points/month (sourced: bisb.com/en/products/bisb-rewards)",
    redemptionOptions: [
      { type: "cashback", label: "Cashback: 5,000–10,000 pts", valuePerPointFils: 8, conditions: "Sourced — 8 fils/point in this redemption band" },
      { type: "cashback", label: "Cashback: 10,001–20,000 pts", valuePerPointFils: 9, conditions: "Sourced — 9 fils/point in this redemption band" },
      { type: "cashback", label: "Cashback: >20,000 pts", valuePerPointFils: 10, conditions: "Sourced — 10 fils/point above 20,000 points" },
      { type: "transfer", label: "Transfer to Falconflyer", valuePerPointFils: 1.7, conditions: "Direct point-to-mile transfer — BisB does not publish the exact ratio; value is estimated" },
      { type: "transfer", label: "Transfer to AlFursan", valuePerPointFils: 1.4, conditions: "Sourced ratio: 1,000 BisB Points = 650 AlFursan Miles; redemption value estimated" },
      { type: "transfer", label: "Transfer to Etihad Guest", valuePerPointFils: 1.5, conditions: "Direct conversion — ratio not publicly disclosed; value estimated" },
      { type: "transfer", label: "Transfer to Shukran", valuePerPointFils: 1.1, conditions: "Direct conversion — ratio not publicly disclosed; value estimated" },
    ],
  },
  {
    id: "nbb-points",
    name: "Points by NBB",
    nameAr: "نقاط البنك الأهلي المتحد",
    currencyName: "NBB Base Points",
    operator: "National Bank of Bahrain",
    expiryPolicy: "Points do not expire while the card remains active",
    minRedemption: "1,000 points (BHD 10) — sourced: Points by NBB app",
    redemptionOptions: [
      { type: "cashback", label: "Cashback (100 pts = BHD 1)", valuePerPointFils: 10, conditions: "Sourced" },
      { type: "merchandise", label: "Charity donation or Ministry-monitored prize raffle entry", valuePerPointFils: 10, conditions: "Sourced — same 10 fils/point value" },
    ],
  },
  {
    id: "bbk-rewardz",
    name: "BBK Loyalty Rewards",
    currencyName: "Loyalty Bonus Points",
    operator: "Bank of Bahrain and Kuwait",
    expiryPolicy: "Points expire 36 months after being earned",
    minRedemption: "Welcome bonus: 2,500 points on activation, +5,000 on salary/financing transfer (sourced)",
    redemptionOptions: [
      { type: "cashback", label: "Statement cashback", valuePerPointFils: 2, conditions: "Estimated — exact rate not published" },
      { type: "merchandise", label: "Retail gifts / merchant vouchers", valuePerPointFils: 2.2, conditions: "Estimated" },
    ],
  },
  {
    id: "kfh-bahrain-rewards",
    name: "KFH Bahrain Rewards",
    currencyName: "Reward Points",
    operator: "KFH Bahrain (formerly Ahli United Bank)",
    expiryPolicy: "Points expire 24 months after being earned",
    redemptionOptions: [
      { type: "cashback", label: "Cashback", valuePerPointFils: 1.5, conditions: "Estimated — not covered by current research pass" },
      { type: "transfer", label: "Transfer to Falconflyer", valuePerPointFils: 2.1, conditions: "Estimated" },
    ],
  },
  {
    id: "ithmaar-rewards",
    name: "Ithmaar Bank Rewards (legacy)",
    currencyName: "Ithmaar Points",
    operator: "Ithmaar Bank — retail portfolio migrated to Al Salam Bank in 2022",
    expiryPolicy:
      "No longer actively issued. Sourced: Al Salam Bank confirms Ithmaar credit/prepaid cardholders were automatically migrated into the Al Salam Loyalty Rewards Scheme.",
    redemptionOptions: [{ type: "cashback", label: "Cashback (legacy holders — see Al Salam Bank)", valuePerPointFils: 1 }],
  },
  {
    id: "hsbc-air-miles",
    name: "HSBC Air Miles",
    currencyName: "Air Miles",
    operator: "HSBC Bahrain",
    expiryPolicy: "Not publicly specified",
    redemptionOptions: [
      { type: "cashback", label: "Cashback / statement credit", valuePerPointFils: 1.5, conditions: "Estimated — HSBC confirms Air Miles earning but not a fixed cash value" },
      { type: "transfer", label: "Transfer to Falconflyer / AlFursan", valuePerPointFils: 2.3, conditions: "Estimated" },
    ],
  },
  {
    id: "sc-360-rewards",
    name: "Standard Chartered 360° Rewards",
    currencyName: "360° Reward Points",
    operator: "Standard Chartered Bahrain",
    expiryPolicy: "Points are valid for 3 years from the transaction date (sourced: sc.com/bh/credit-cards)",
    redemptionOptions: [
      { type: "cashback", label: "Purchase with Rewards (real-time statement offset)", valuePerPointFils: 2, conditions: "Sourced feature, estimated fils value" },
      { type: "transfer", label: "Transfer to an airline partner", valuePerPointFils: 2.8, conditions: "SC confirms airline transfer is offered; specific partners/ratio not published" },
    ],
  },
  {
    id: "thameen-loyalty",
    name: "Thameen Loyalty",
    currencyName: "Thameen Points",
    operator: "CrediMax (BBK Group)",
    expiryPolicy: "Points expire 36 months from the transaction date (sourced: credimax.com.bh/thameen-loyalty)",
    minRedemption: "Cashback credited within 3 business days; gift vouchers within 5 business days (sourced)",
    redemptionOptions: [
      { type: "cashback", label: "Statement cashback", valuePerPointFils: 1, conditions: "Estimated — CrediMax does not publish a fixed conversion rate" },
      { type: "transfer", label: "Transfer to Falconflyer", valuePerPointFils: 1.7, conditions: "One of 11+ sourced airline/hotel partners; ratio not published" },
      { type: "transfer", label: "Transfer to AlFursan", valuePerPointFils: 1.4, conditions: "Sourced partner; ratio not published" },
      { type: "transfer", label: "Transfer to Avios (BA/Qatar Airways)", valuePerPointFils: 1.6, conditions: "Sourced partner; ratio not published" },
      { type: "transfer", label: "Transfer to Etihad Guest", valuePerPointFils: 1.5, conditions: "Sourced partner; ratio not published" },
      { type: "merchandise", label: "SAVUR merchant discount vouchers", valuePerPointFils: 0, conditions: "Free access for all Thameen cardholders — does not deduct points" },
    ],
  },
  {
    id: "alsalam-cashback",
    name: "Al Salam Bank Automated Cashback",
    currencyName: "Direct Cashback",
    operator: "Al Salam Bank",
    expiryPolicy: "N/A — direct cashback, credited monthly. Sourced: alsalambank.com/en/loyalty-rewards-program",
    redemptionOptions: [{ type: "cashback", label: "Automated cashback (up to 5%)", valuePerPointFils: 1000, conditions: "Sourced cap; exact rate by card/spend" }],
  },
  {
    id: "khaleeji-rewards",
    name: "Khaleeji Bank Rewards",
    currencyName: "Khaleeji Points",
    operator: "Khaleeji Bank",
    expiryPolicy: "Not publicly specified",
    redemptionOptions: [{ type: "cashback", label: "1% statement cashback", valuePerPointFils: 1000, conditions: "Sourced: khaleeji.bank/pages-sidebar-nav/credit-cards" }],
  },
  {
    id: "nbk-bahrain-rewards",
    name: "NBK Rewards Program",
    currencyName: "NBK Rewards Points",
    operator: "National Bank of Kuwait — Bahrain",
    expiryPolicy: "Not publicly specified",
    redemptionOptions: [
      { type: "cashback", label: "Direct cashback to statement", valuePerPointFils: 1.5, conditions: "Sourced channel (nbk.com/bahrain), estimated fils value" },
      { type: "merchandise", label: "Shopping catalog (electronics, gadgets, luxury goods)", valuePerPointFils: 1.5, conditions: "Sourced channel, estimated value" },
      { type: "flight", label: "Direct travel booking (flights, hotels, cars)", valuePerPointFils: 1.6, conditions: "Sourced channel, estimated value" },
    ],
  },
];

export const programById = (id: string) => LOYALTY_PROGRAMS.find((p) => p.id === id);
