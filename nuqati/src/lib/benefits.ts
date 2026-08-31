import type { Card, RedemptionOption, RedemptionType, TransferPartner } from "@/lib/types";
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

export interface RedemptionReach {
  /** Every end-use a card's currency can reach — directly, or one transfer hop away. */
  types: Set<RedemptionType>;
  /** Every program id reachable — the card's own program plus any active transfer target. */
  programIds: Set<string>;
}

/**
 * Resolves everywhere a card's points/miles/cashback can end up — its own program's
 * redemption options, plus (one hop through active transfer partners) the redemption
 * options of every program it can transfer into. Used to filter "points can be used
 * for X" without requiring the card to be in a wallet.
 */
export function resolvedRedemptionReach(card: Card): RedemptionReach {
  const types = new Set<RedemptionType>();
  const programIds = new Set<string>();
  const program = programById(card.loyaltyProgramId);
  if (!program) return { types, programIds };

  programIds.add(program.id);
  program.redemptionOptions.forEach((o) => types.add(o.type));

  transfersFrom(program.id)
    .filter((t) => t.isActive)
    .forEach((t) => {
      const target = programById(t.toProgramId);
      if (!target) return;
      programIds.add(target.id);
      target.redemptionOptions.forEach((o) => types.add(o.type));
    });

  return { types, programIds };
}
