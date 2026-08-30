import type { Card, RedemptionOption, TransferPartner } from "@/lib/types";
import { programById } from "@/data/loyaltyPrograms";
import { transfersFrom } from "@/data/transferPartners";

export interface PointsUsage {
  programName: string;
  currencyName: string;
  expiryPolicy: string;
  minRedemption?: string;
  /** Every way to redeem this card's currency — cashback tiers, transfers, merchandise, flights. */
  redemptionOptions: RedemptionOption[];
  /** Bank-to-airline/hotel transfer rows for this card's program, if any are mapped. */
  transferPartners: TransferPartner[];
}

/** Resolves "how can the points/miles/cashback this card earns be used" — no wallet membership required. */
export function pointsUsageFor(card: Card): PointsUsage | undefined {
  const program = programById(card.loyaltyProgramId);
  if (!program) return undefined;

  // A transfer partner already named (with a value) in a "transfer" redemption option
  // would be a near-duplicate line below — only list the ones that add new information.
  const transferLabelCores = program.redemptionOptions
    .filter((o) => o.type === "transfer")
    .map((o) => o.label.replace(/^Transfer to /i, "").split("(")[0].trim().toLowerCase());
  const transferPartners = transfersFrom(program.id).filter((t) => {
    if (!t.isActive) return false;
    const partnerName = (programById(t.toProgramId)?.name ?? "").toLowerCase();
    return !transferLabelCores.some((core) => core && (partnerName.includes(core) || core.includes(partnerName)));
  });

  return {
    programName: program.name,
    currencyName: program.currencyName,
    expiryPolicy: program.expiryPolicy,
    minRedemption: program.minRedemption,
    redemptionOptions: program.redemptionOptions,
    transferPartners,
  };
}
