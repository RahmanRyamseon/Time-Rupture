"use client";

import { useMemo, useState } from "react";
import { useWorkpaper } from "@/lib/workpaper/context";
import { toCsv, downloadCsv } from "@/lib/vat/csv";
import type { VatLine } from "@/lib/vat/types";

interface Category {
  type: string;
  article: string;
  severity: "Critical" | "High" | "Medium";
}

function categorize(finding: string): Category {
  if (finding.includes("VAT booked")) return { type: "VAT tie-out mismatch", article: "Art. 24 (VAT charge)", severity: "Critical" };
  if (finding.includes("Total (")) return { type: "Gross tie-out mismatch", article: "Art. 24 (VAT charge)", severity: "High" };
  if (finding.includes("not recoverable — blocked")) return { type: "Blocked input", article: "Art. 42(C)", severity: "High" };
  if (finding.includes("reverse charge")) return { type: "Import reverse charge", article: "Art. 9", severity: "Medium" };
  if (finding.includes("Export invoice")) return { type: "Export zero-rating inconsistency", article: "Art. 53", severity: "High" };
  if (finding.includes("Duplicate")) return { type: "Duplicate invoice", article: "Internal control", severity: "High" };
  if (finding.includes("Missing") || finding.includes("not a valid")) return { type: "Invoice completeness / TRN", article: "Art. 53", severity: "Critical" };
  if (finding.includes("outside the declared period")) return { type: "Tax point outside period", article: "Art. 24/25", severity: "Medium" };
  if (finding.includes("Booked in")) return { type: "Foreign currency line", article: "Executive Regulations", severity: "Medium" };
  return { type: "Other", article: "—", severity: "Medium" };
}

const SEVERITY_STYLE: Record<Category["severity"], { bg: string; fg: string }> = {
  Critical: { bg: "#f8e6e1", fg: "#b42318" },
  High: { bg: "#fdece3", fg: "#b45a18" },
  Medium: { bg: "#fdf3d8", fg: "#8a6100" },
};

interface ExceptionRow {
  ref: string;
  desc: string;
  applied: string;
  expected: string;
  action: string;
  type: string;
  article: string;
  severity: Category["severity"];
}

function toRows(lines: VatLine[], prefix: string): ExceptionRow[] {
  const rows: ExceptionRow[] = [];
  for (const l of lines) {
    if (l.status === "Verified") continue;
    for (const finding of l.findings) {
      const cat = categorize(finding);
      rows.push({
        ref: `${prefix}${l.inv || l.id}`,
        desc: l.desc || l.party,
        applied: `Net ${l.net.toFixed(3)} / VAT ${l.vat.toFixed(3)}`,
        expected: l.nature,
        action: finding,
        ...cat,
      });
    }
  }
  return rows;
}

export default function ExceptionsPage() {
  const { apRows, arRows } = useWorkpaper();
  const [activeType, setActiveType] = useState<string | null>(null);

  const allRows = useMemo(() => [...toRows(apRows, "AP-"), ...toRows(arRows, "AR-")], [apRows, arRows]);

  const summary = useMemo(() => {
    const m = new Map<string, { type: string; article: string; severity: Category["severity"]; count: number }>();
    for (const r of allRows) {
      const existing = m.get(r.type);
      if (existing) existing.count += 1;
      else m.set(r.type, { type: r.type, article: r.article, severity: r.severity, count: 1 });
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [allRows]);

  const grouped = useMemo(() => {
    const m = new Map<string, ExceptionRow[]>();
    for (const r of allRows) {
      if (activeType && r.type !== activeType) continue;
      const arr = m.get(r.type) ?? [];
      arr.push(r);
      m.set(r.type, arr);
    }
    return Array.from(m.entries());
  }, [allRows, activeType]);

  function exportCsv() {
    const headers = ["Type", "Severity", "Article", "Ref", "Description", "Applied", "Expected/Nature", "Finding"];
    const rows = allRows.map((r) => [r.type, r.severity, r.article, r.ref, r.desc, r.applied, r.expected, r.action]);
    downloadCsv("vat-exceptions-report.csv", toCsv(headers, rows));
  }

  return (
    <section style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Exceptions & Non-Compliance Report</div>
          <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>
            Consolidated auditor worklist — every transaction failing compliance, grouped by issue type with the Regulation article
            breached.
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={exportCsv} style={{ background: "var(--danger)", border: "none", color: "#fff", padding: "8px 15px", borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
          Export exception report ↓
        </button>
      </div>

      <div style={{ fontSize: 10.5, color: "var(--muted-soft)", marginBottom: 8 }}>
        Click a category to filter the worklist below; click it again (or &ldquo;All exceptions&rdquo;) to clear.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 18 }}>
        <div
          onClick={() => setActiveType(null)}
          style={{ background: !activeType ? "var(--masthead)" : "var(--surface)", color: !activeType ? "#fff" : "inherit", border: "1px solid var(--border)", borderRadius: 6, padding: "12px 14px", cursor: "pointer" }}
        >
          <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{allRows.length}</div>
          <div style={{ fontSize: 10.5, marginTop: 4, lineHeight: 1.3, opacity: !activeType ? 0.85 : 1 }}>All exceptions</div>
        </div>
        {summary.map((s) => (
          <div
            key={s.type}
            onClick={() => setActiveType(activeType === s.type ? null : s.type)}
            style={{ background: activeType === s.type ? "var(--masthead)" : "var(--surface)", color: activeType === s.type ? "#fff" : "inherit", border: "1px solid var(--border)", borderRadius: 6, padding: "12px 14px", cursor: "pointer" }}
          >
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{s.count}</div>
            <div style={{ fontSize: 10.5, color: activeType === s.type ? undefined : "var(--muted)", marginTop: 4, lineHeight: 1.3 }}>{s.type}</div>
          </div>
        ))}
      </div>

      {allRows.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: 30, textAlign: "center", color: "var(--brand)", fontWeight: 600 }}>
          ✓ No compliance exceptions detected in the loaded data.
        </div>
      ) : (
        grouped.map(([type, rows]) => {
          const sev = rows[0].severity;
          const sevStyle = SEVERITY_STYLE[sev];
          return (
            <div key={type} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-muted)", borderBottom: "1px solid #e3e6ea" }}>
                <span style={{ background: sevStyle.bg, color: sevStyle.fg, borderRadius: 4, padding: "2px 8px", fontSize: 10.5, fontWeight: 600 }}>{sev}</span>
                <span style={{ fontWeight: 600, fontSize: 12.5 }}>{type}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-soft)" }}>{rows[0].article}</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>{rows.length} item(s)</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1080, fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                      <th style={{ padding: "7px 12px", fontWeight: 600 }}>Ref</th>
                      <th style={{ padding: "7px 12px", fontWeight: 600, minWidth: 240 }}>Description</th>
                      <th style={{ padding: "7px 12px", fontWeight: 600 }}>Applied</th>
                      <th style={{ padding: "7px 12px", fontWeight: 600 }}>Nature</th>
                      <th style={{ padding: "7px 12px", fontWeight: 600, minWidth: 280 }}>Finding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((e, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #eef0f2" }}>
                        <td style={{ padding: "7px 12px", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{e.ref}</td>
                        <td style={{ padding: "7px 12px", color: "#3a424c", lineHeight: 1.4 }}>{e.desc}</td>
                        <td style={{ padding: "7px 12px", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{e.applied}</td>
                        <td style={{ padding: "7px 12px", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{e.expected}</td>
                        <td style={{ padding: "7px 12px", color: "var(--muted)", lineHeight: 1.45 }}>{e.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
