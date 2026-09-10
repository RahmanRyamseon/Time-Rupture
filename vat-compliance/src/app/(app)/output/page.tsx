"use client";

import { useMemo } from "react";
import { useWorkpaper } from "@/lib/workpaper/context";
import LinesTable from "../LinesTable";

export default function OutputVatPage() {
  const { arRows } = useWorkpaper();

  const reconRows = useMemo(() => {
    const byNature = new Map<string, { revenue: number; booked: number }>();
    for (const r of arRows) {
      const entry = byNature.get(r.nature) ?? { revenue: 0, booked: 0 };
      entry.revenue += r.net;
      entry.booked += r.vat;
      byNature.set(r.nature, entry);
    }
    return Array.from(byNature.entries()).map(([nature, { revenue, booked }]) => {
      const zeroRated = nature === "Zero-rated" || nature === "Exempt" || nature === "Export (zero-rated)";
      const expected = zeroRated ? 0 : Math.round(revenue * 0.1 * 1000) / 1000;
      const variance = Math.round((booked - expected) * 1000) / 1000;
      return { nature, revenue, expected, booked, variance };
    });
  }, [arRows]);

  return (
    <>
      <LinesTable
        title="Output VAT Verification — Accounts Receivable"
        subtitle="Per-line verdict · VAT = 10% of net, totals tie-out, export zero-rating (Art. 53), customer TRN, duplicates & FX"
        partyLabel="Customer"
        rows={arRows}
        exportName="output-vat-verification.csv"
      />
      {reconRows.length > 0 && (
        <section style={{ padding: "0 24px 24px" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "14px 16px" }}>
            <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 9 }}>Reconciliation — VAT booked vs 10% of net (per treatment)</div>
            <table style={{ borderCollapse: "collapse", fontSize: 11.5, width: "100%", maxWidth: 640 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={{ padding: "5px 8px", fontWeight: 600 }}>Treatment</th>
                  <th style={{ padding: "5px 8px", fontWeight: 600, textAlign: "right" }}>Σ Net</th>
                  <th style={{ padding: "5px 8px", fontWeight: 600, textAlign: "right" }}>Expected VAT</th>
                  <th style={{ padding: "5px 8px", fontWeight: 600, textAlign: "right" }}>Booked VAT</th>
                  <th style={{ padding: "5px 8px", fontWeight: 600, textAlign: "right" }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {reconRows.map((c) => (
                  <tr key={c.nature} style={{ borderTop: "1px solid #eef0f2" }}>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)" }}>{c.nature}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{c.revenue.toFixed(3)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{c.expected.toFixed(3)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{c.booked.toFixed(3)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-mono)", color: Math.abs(c.variance) > 0.01 ? "var(--danger)" : "var(--brand)" }}>
                      {c.variance.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
