import type { Category } from "@/lib/types";

export const CATEGORIES: Category[] = [
  {
    slug: "uan-login",
    name: "UAN Activation & Login",
    icon: "🔑",
    description: "UAN not activating, OTP never arrives, forgotten password, more than one UAN.",
  },
  {
    slug: "kyc",
    name: "KYC & Detail Corrections",
    icon: "🪪",
    description: "KYC stuck pending, name/DOB mismatch with Aadhaar, bank seeding failures.",
  },
  {
    slug: "claims",
    name: "Claims & Withdrawal",
    icon: "💰",
    description: "Claim rejected, final settlement after resigning, partial withdrawal (advance).",
  },
  {
    slug: "transfer",
    name: "PF Transfer Between Jobs",
    icon: "🔁",
    description: "Transfer request stuck, OTP issues, rejected transfer claims.",
  },
  {
    slug: "employer",
    name: "Employer Non-Compliance",
    icon: "🏢",
    description: "PF deducted from salary but never deposited, unresponsive or closed employer.",
  },
  {
    slug: "pension",
    name: "EPS Pension",
    icon: "🧓",
    description: "Higher pension option status, pension certificate and EPS scheme issues.",
  },
  {
    slug: "nomination",
    name: "Nomination & Death Claims",
    icon: "📜",
    description: "e-Nomination won't save, claiming PF after a member's death.",
  },
  {
    slug: "tax",
    name: "Tax & TDS",
    icon: "🧾",
    description: "TDS deducted on withdrawal, tax-free vs. taxable PF, Form 15G/15H.",
  },
  {
    slug: "passbook",
    name: "Passbook & Interest",
    icon: "📒",
    description: "Passbook not updating, annual interest missing or delayed.",
  },
  {
    slug: "contributions",
    name: "Contributions, VPF & Eligibility",
    icon: "📊",
    description: "Voluntary Provident Fund, the ₹15,000 wage ceiling, and who's actually eligible for EPF.",
  },
];

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
