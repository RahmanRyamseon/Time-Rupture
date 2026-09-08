"use client";

import { useWorkpaper } from "@/lib/workpaper/context";
import LinesTable from "../LinesTable";

export default function InputVatPage() {
  const { apRows } = useWorkpaper();
  return (
    <LinesTable
      title="Input VAT Verification — Accounts Payable"
      subtitle="Per-line verdict · VAT = 10% of net, totals tie-out, supplier TRN, blocked input (Art. 42C), import reverse charge (Art. 9), tax point & period (Art. 24/25), invoice completeness (Art. 53), duplicates & FX"
      partyLabel="Supplier"
      rows={apRows}
      exportName="input-vat-verification.csv"
    />
  );
}
