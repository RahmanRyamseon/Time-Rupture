"use client";

import { useMemo } from "react";
import { useWorkpaper } from "@/lib/workpaper/context";
import { computeReturnBoxes } from "@/lib/vat/returnBoxes";
import { toCsv, downloadCsv } from "@/lib/vat/csv";

export default function ReturnPage() {
  const { apRows, arRows, returnFiled, setFiledVat } = useWorkpaper();

  const boxes = useMemo(() => {
    const sum = (rows: typeof apRows, nature: string, field: "net" | "vat") =>
      rows.filter((r) => r.nature === nature).reduce((acc, r) => acc + r[field], 0);

    const importsNet = sum(apRows, "Import (reverse charge)", "net");

    return computeReturnBoxes({
      standardSalesNet: sum(arRows, "Standard-rated", "net"),
      standardSalesVat: sum(arRows, "Standard-rated", "vat"),
      zeroRatedSalesNet: sum(arRows, "Zero-rated", "net"),
      exportSalesNet: sum(arRows, "Export (zero-rated)", "net"),
      exemptSalesNet: sum(arRows, "Exempt", "net"),
      domesticReverseChargeNet: 0,
      domesticReverseChargeVat: 0,
      standardPurchasesNet: sum(apRows, "Standard-rated", "net"),
      standardPurchasesVat: sum(apRows, "Standard-rated", "vat"),
      importsNet,
      importsVat: Math.round(importsNet * 0.1 * 1000) / 1000,
      zeroRatedPurchasesNet: sum(apRows, "Zero-rated", "net"),
      exemptPurchasesNet: sum(apRows, "Exempt", "net"),
      blockedInputVat: sum(apRows, "Blocked input", "vat"),
    });
  }, [apRows, arRows]);

  function exportCsv() {
    const headers = ["Box", "Description", "Amount (BHD)", "VAT (BHD)", "Filed VAT", "Variance"];
    const rows = boxes.map((b) => {
      const filed = returnFiled[b.box] ?? null;
      const variance = filed === null ? "" : (filed - b.vat).toFixed(3);
      return [b.box, b.label, b.amount.toFixed(3), b.vat.toFixed(3), filed === null ? "" : filed.toFixed(3), variance];
    });
    downloadCsv("vat-return-mapping.csv", toCsv(headers, rows));
  }

  return (
    <section style={{ padding: "20px 24px", maxWidth: 1080 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>VAT Return — NBR Box Mapping & Reconciliation</div>
          <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>
            Verified lines mapped to illustrative NBR return boxes. Enter the filed return values to compute variance.
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={exportCsv} style={{ background: "#fff", border: "1px solid #cfd3d9", color: "#3a424c", padding: "7px 13px", borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
          Export CSV ↓
        </button>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11.5 }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)", color: "var(--muted)", textAlign: "left" }}>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Box</th>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Description</th>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>Amount (BHD)</th>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>VAT (BHD)</th>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>Filed VAT</th>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {boxes.map((b) => {
              const filed = returnFiled[b.box] ?? null;
              const variance = filed === null ? null : Math.round((filed - b.vat) * 1000) / 1000;
              return (
                <tr key={b.box}>
                  <td style={{ padding: "7px 12px", fontFamily: "var(--font-mono)", fontWeight: 600, borderBottom: "1px solid #eef0f2", whiteSpace: "nowrap" }}>{b.box}</td>
                  <td style={{ padding: "7px 12px", borderBottom: "1px solid #eef0f2" }}>{b.label}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", fontFamily: "var(--font-mono)", borderBottom: "1px solid #eef0f2" }}>{b.amount.toFixed(3)}</td>
                  <td style={{ padding: "7px 12px", textAlign: "right", fontFamily: "var(--font-mono)", borderBottom: "1px solid #eef0f2" }}>{b.vat.toFixed(3)}</td>
                  <td style={{ padding: "5px 12px", textAlign: "right", borderBottom: "1px solid #eef0f2" }}>
                    <input
                      value={filed === null ? "" : filed}
                      onChange={(e) => setFiledVat(b.box, e.target.value === "" ? null : parseFloat(e.target.value))}
                      placeholder="—"
                      style={{ width: 100, textAlign: "right", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 6px", fontFamily: "var(--font-mono)" }}
                    />
                  </td>
                  <td style={{ padding: "7px 12px", textAlign: "right", fontFamily: "var(--font-mono)", borderBottom: "1px solid #eef0f2" }}>
                    {variance === null ? (
                      <span style={{ color: "var(--muted-soft)" }}>—</span>
                    ) : (
                      <span style={{ color: Math.abs(variance) > 0.01 ? "var(--danger)" : "var(--brand)" }}>{variance.toFixed(3)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--muted-soft)", marginTop: 9, lineHeight: 1.6 }}>
        Treatments are derived per line from the amounts, country and description. Imports (Box 10a) are self-accounted under
        reverse charge — the output and input VAT cancel, so Net VAT (Box 17) = output VAT on sales − recoverable input VAT on
        purchases. Box numbers/labels are illustrative — confirm against the current NBR return template before filing.
      </div>
    </section>
  );
}
