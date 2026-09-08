// Illustrative NBR VAT return box mapping. Box numbers/labels here follow
// the general shape of Bahrain's VAT200 return but are not guaranteed to
// match the NBR's current published template exactly — confirm the live
// return form before filing from this mapping.

export interface ReturnBoxInput {
  standardSalesNet: number;
  standardSalesVat: number;
  zeroRatedSalesNet: number;
  exportSalesNet: number;
  exemptSalesNet: number;
  domesticReverseChargeNet: number;
  domesticReverseChargeVat: number;
  standardPurchasesNet: number;
  standardPurchasesVat: number;
  importsNet: number;
  importsVat: number;
  zeroRatedPurchasesNet: number;
  exemptPurchasesNet: number;
  blockedInputVat: number;
}

export interface ReturnBoxRow {
  box: string;
  label: string;
  amount: number;
  vat: number;
}

export function computeReturnBoxes(input: ReturnBoxInput): ReturnBoxRow[] {
  const totalOutputVat = input.standardSalesVat + input.domesticReverseChargeVat;
  const recoverableInputVat = input.standardPurchasesVat + input.importsVat - input.blockedInputVat;
  const netVat = Math.round((totalOutputVat - recoverableInputVat) * 1000) / 1000;

  return [
    { box: "1", label: "Standard-rated sales", amount: input.standardSalesNet, vat: input.standardSalesVat },
    { box: "2", label: "Zero-rated domestic sales", amount: input.zeroRatedSalesNet, vat: 0 },
    { box: "3", label: "Exports", amount: input.exportSalesNet, vat: 0 },
    { box: "4", label: "Exempt supplies", amount: input.exemptSalesNet, vat: 0 },
    { box: "5", label: "Domestic reverse charge sales", amount: input.domesticReverseChargeNet, vat: input.domesticReverseChargeVat },
    {
      box: "6",
      label: "Total output VAT",
      amount: input.standardSalesNet + input.domesticReverseChargeNet,
      vat: totalOutputVat,
    },
    { box: "10a", label: "Imports (reverse charge)", amount: input.importsNet, vat: input.importsVat },
    { box: "10b", label: "Standard-rated purchases", amount: input.standardPurchasesNet, vat: input.standardPurchasesVat },
    { box: "11", label: "Zero-rated purchases", amount: input.zeroRatedPurchasesNet, vat: 0 },
    { box: "12", label: "Exempt purchases", amount: input.exemptPurchasesNet, vat: 0 },
    { box: "13", label: "Blocked input VAT (Art. 42C, non-recoverable)", amount: 0, vat: -input.blockedInputVat },
    { box: "14", label: "Net recoverable input VAT", amount: 0, vat: recoverableInputVat },
    { box: "17", label: "Net VAT due / (recoverable)", amount: 0, vat: netVat },
  ];
}
