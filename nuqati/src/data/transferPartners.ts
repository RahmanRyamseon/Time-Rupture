import type { TransferPartner } from "@/lib/types";

// Bank points → airline/hotel transfer map — the core "intelligence layer" of the app.
// Ratios marked "sourced" come from published bank pages; others are estimated because
// most Bahrain issuers don't publish a fixed conversion rate (see nuqati/README.md).
export const TRANSFER_PARTNERS: TransferPartner[] = [
  // ---------------- BisB Rewards ----------------
  {
    fromProgramId: "bisb-rewards",
    toProgramId: "saudia-alfursan",
    ratioLabel: "1,000 BisB Points = 650 AlFursan Miles (sourced: bisb.com/en/products/bisb-rewards)",
    ratioFromPerTo: 1000 / 650,
    transferTimeDays: "2 business days (sourced)",
    isActive: true,
    sweetSpot: "The only BisB transfer ratio Bahrain Islamic Bank publishes",
  },
  {
    fromProgramId: "bisb-rewards",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "Direct point-to-mile transfer — exact ratio not publicly disclosed",
    transferTimeDays: "Not specified",
    isActive: true,
  },
  {
    fromProgramId: "bisb-rewards",
    toProgramId: "etihad-guest",
    ratioLabel: "Direct conversion option — exact ratio not publicly disclosed",
    isActive: true,
  },
  {
    fromProgramId: "bisb-rewards",
    toProgramId: "landmark-shukran",
    ratioLabel: "Direct conversion option — exact ratio not publicly disclosed",
    isActive: true,
  },

  // ---------------- CrediMax Thameen — the widest transfer network in Bahrain ----------------
  {
    fromProgramId: "thameen-loyalty",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "Available — ratio not publicly disclosed",
    isActive: true,
    sweetSpot: "One of 11+ Thameen airline/hotel partners (sourced: credimax.com.bh/thameen-loyalty)",
  },
  { fromProgramId: "thameen-loyalty", toProgramId: "saudia-alfursan", ratioLabel: "Available — ratio not publicly disclosed", isActive: true },
  { fromProgramId: "thameen-loyalty", toProgramId: "avios", ratioLabel: "Available — ratio not publicly disclosed", isActive: true },
  { fromProgramId: "thameen-loyalty", toProgramId: "etihad-guest", ratioLabel: "Available — ratio not publicly disclosed", isActive: true },
  { fromProgramId: "thameen-loyalty", toProgramId: "accor-all", ratioLabel: "Available — ratio not publicly disclosed", isActive: true },
  { fromProgramId: "thameen-loyalty", toProgramId: "turkish-miles-smiles", ratioLabel: "Available — ratio not publicly disclosed", isActive: true },
  { fromProgramId: "thameen-loyalty", toProgramId: "flynas-nasmiles", ratioLabel: "Available — ratio not publicly disclosed", isActive: true },
  { fromProgramId: "thameen-loyalty", toProgramId: "airasia-points", ratioLabel: "Available — ratio not publicly disclosed", isActive: true },
  { fromProgramId: "thameen-loyalty", toProgramId: "radisson-rewards", ratioLabel: "Available — ratio not publicly disclosed", isActive: true },

  // ---------------- Al Salam Bank ----------------
  {
    fromProgramId: "alsalam-cashback",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "Automated Gulf Air Miles Scheme — cardholders can opt to route spend directly into Falconflyer instead of cashback (sourced)",
    isActive: true,
    sweetSpot: "Choose this scheme at account setup instead of the 5% automated cashback scheme",
  },

  // ---------------- KFH Bahrain, HSBC, Standard Chartered, BBK — estimated, not covered by sourced research ----------------
  {
    fromProgramId: "kfh-bahrain-rewards",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "Estimated ≈1.4 pts : 1 mile — not independently verified",
    ratioFromPerTo: 1.4,
    isActive: true,
  },
  {
    fromProgramId: "hsbc-air-miles",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "HSBC confirms Air Miles earning; transfer ratio not published — estimated ≈1.3 pts : 1 mile",
    ratioFromPerTo: 1.3,
    isActive: true,
  },
  {
    fromProgramId: "hsbc-air-miles",
    toProgramId: "saudia-alfursan",
    ratioLabel: "Estimated ≈1.5 pts : 1 mile — not independently verified",
    ratioFromPerTo: 1.5,
    isActive: true,
  },
  {
    fromProgramId: "sc-360-rewards",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "SC confirms airline transfer is offered; specific partner/ratio not published — estimated ≈1.2 pts : 1 mile",
    ratioFromPerTo: 1.2,
    isActive: true,
  },
  {
    fromProgramId: "bbk-rewardz",
    toProgramId: "gulf-air-falconflyer",
    ratioLabel: "Estimated ≈2.2 pts : 1 mile — not independently verified",
    ratioFromPerTo: 2.2,
    isActive: true,
  },

  // ---------------- Cashback-only, no airline transfer ----------------
  { fromProgramId: "nbb-points", toProgramId: "gulf-air-falconflyer", ratioLabel: "No airline transfer offered — cashback, charity and Ministry raffle entries only (sourced)", isActive: false },
  { fromProgramId: "khaleeji-rewards", toProgramId: "gulf-air-falconflyer", ratioLabel: "Earns Falconflyer miles directly alongside cashback — no separate transfer step needed (sourced)", isActive: false },
  { fromProgramId: "nbk-bahrain-rewards", toProgramId: "gulf-air-falconflyer", ratioLabel: "No airline transfer offered — travel booking, catalog or cashback only (sourced)", isActive: false },
];

export const transfersFrom = (programId: string) =>
  TRANSFER_PARTNERS.filter((t) => t.fromProgramId === programId);
