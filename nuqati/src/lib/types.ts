// Core data entities — see product spec section 4.1

export type MerchantCategoryId =
  | "groceries"
  | "dining"
  | "fuel"
  | "online"
  | "travel"
  | "education"
  | "utilities"
  | "healthcare"
  | "other";

export interface MerchantCategory {
  id: MerchantCategoryId;
  nameEn: string;
  nameAr: string;
  icon: string;
  commonMerchants: string[];
}

export type EarnCurrency = "cashback" | "points" | "miles";

export interface EarnRule {
  category: MerchantCategoryId;
  /** Rate expressed per BHD 1 spent. For cashback this is the cashback fraction (0.03 = 3%). For points/miles this is units earned per BHD 1. */
  rate: number;
  currency: EarnCurrency;
  /** Monthly spend cap (BHD) after which this rule reverts to the card's base rate. Undefined = uncapped. */
  capPerMonthBhd?: number;
  minSpendRequiredBhd?: number;
  notes?: string;
}

export type CardTier = "Classic" | "Gold" | "Platinum" | "Signature" | "Infinite" | "World" | "Titanium";

export interface Card {
  id: string;
  bank: string;
  bankShort: string;
  cardName: string;
  tier: CardTier;
  network: "Visa" | "Mastercard" | "Amex";
  isIslamic: boolean;
  annualFeeBhd: number;
  minSalaryBhd: number;
  currency: EarnCurrency;
  /** Loyalty program this card's earnings accrue to. */
  loyaltyProgramId: string;
  /** Base (non-bonused) earn rate per BHD 1, in the card's currency units. */
  baseRate: number;
  earnRules: EarnRule[];
  welcomeBonus?: string;
  keyBenefits: string[];
  lastVerified: string; // ISO date
  isActive: boolean;
}

export type RedemptionType = "cashback" | "flight" | "hotel" | "merchandise" | "transfer";

export interface RedemptionOption {
  type: RedemptionType;
  label: string;
  /** Value per point/mile in fils (1 BHD = 1000 fils). */
  valuePerPointFils: number;
  conditions?: string;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  nameAr?: string;
  currencyName: string;
  operator: string;
  expiryPolicy: string;
  minRedemption?: string;
  redemptionOptions: RedemptionOption[];
}

export interface TransferPartner {
  fromProgramId: string;
  toProgramId: string;
  ratioLabel: string;
  /** How many "from" units per 1 "to" unit, when expressible as a single number. */
  ratioFromPerTo?: number;
  minTransfer?: string;
  transferTimeDays?: string;
  isActive: boolean;
  sweetSpot?: string;
}
