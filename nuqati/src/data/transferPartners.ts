import type { TransferPartner } from "@/lib/types";

// Bank points → airline/hotel transfer map — spec section 8.1.
// This map is the core "intelligence layer" of the app.
export const TRANSFER_PARTNERS: TransferPartner[] = [
  {
    fromProgramId: "bisb-rewards",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "Variable, tier-based (≈2 BisB pts : 1 mile on Signature/Infinite)",
    ratioFromPerTo: 2,
    minTransfer: "5,000 points",
    transferTimeDays: "3–5 business days",
    isActive: true,
    sweetSpot: "Transfer to Falconflyer for a BAH–LHR economy award (~6,000 miles)",
  },
  {
    fromProgramId: "bisb-rewards",
    toProgramId: "saudia-alfursan",
    ratioLabel: "Variable, ≈2.5 BisB pts : 1 mile",
    ratioFromPerTo: 2.5,
    minTransfer: "5,000 points",
    transferTimeDays: "5–7 business days",
    isActive: true,
  },
  {
    fromProgramId: "bisb-rewards",
    toProgramId: "landmark-shukran",
    ratioLabel: "Direct points-to-Shukran conversion, ≈1 : 1",
    ratioFromPerTo: 1,
    minTransfer: "1,000 points",
    transferTimeDays: "Instant–48 hours",
    isActive: true,
  },
  {
    fromProgramId: "kfh-bahrain-rewards",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "Variable, ≈1.4 pts : 1 mile",
    ratioFromPerTo: 1.4,
    minTransfer: "5,000 points",
    transferTimeDays: "5–7 business days",
    isActive: true,
  },
  {
    fromProgramId: "hsbc-rewards-bh",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "Variable by card tier, ≈1.3 pts : 1 mile",
    ratioFromPerTo: 1.3,
    minTransfer: "10,000 points",
    transferTimeDays: "7–10 business days",
    isActive: true,
  },
  {
    fromProgramId: "hsbc-rewards-bh",
    toProgramId: "saudia-alfursan",
    ratioLabel: "Variable, ≈1.5 pts : 1 mile",
    ratioFromPerTo: 1.5,
    minTransfer: "10,000 points",
    transferTimeDays: "7–10 business days",
    isActive: true,
  },
  {
    fromProgramId: "sc-360-rewards",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "≈1.2 pts : 1 mile",
    ratioFromPerTo: 1.2,
    minTransfer: "5,000 points",
    transferTimeDays: "3–5 business days",
    isActive: true,
    sweetSpot: "Best redemption value across all Bahrain bank programs",
  },
  {
    fromProgramId: "bbk-rewardz",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "Variable, ≈2.2 pts : 1 mile",
    ratioFromPerTo: 2.2,
    minTransfer: "5,000 points",
    transferTimeDays: "5–7 business days",
    isActive: true,
  },
  {
    fromProgramId: "nbb-points",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "No airline transfer offered — cashback only",
    isActive: false,
  },
  {
    fromProgramId: "ithmaar-rewards",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "No airline transfer offered — cashback only",
    isActive: false,
  },
  {
    fromProgramId: "khaleeji-rewards",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "No airline transfer offered — cashback only",
    isActive: false,
  },
];

export const transfersFrom = (programId: string) =>
  TRANSFER_PARTNERS.filter((t) => t.fromProgramId === programId);
