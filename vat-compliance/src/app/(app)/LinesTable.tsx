"use client";

import { useMemo, useState } from "react";
import type { VatLine } from "@/lib/vat/types";
import { toCsv, downloadCsv } from "@/lib/vat/csv";

const STATUS_STYLE: Record<VatLine["status"], { bg: string; fg: string }> = {
  Verified: { bg: "#e6f2ea", fg: "#0f7a52" },
  Warning: { bg: "#fdf3d8", fg: "#8a6100" },
  Exception: { bg: "#f8e6e1", fg: "#b42318" },
};

const FILTERS: { key: "all" | VatLine["status"]; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Verified", label: "Verified" },
  { key: "Warning", label: "Warning" },
  { key: "Exception", label: "Exception" },
];

export default function LinesTable({
  title,
  subtitle,
  partyLabel,
  rows,
  exportName,
}: {
  title: string;
  subtitle: string;
  partyLabel: string;
  rows: VatLine[];
  exportName: string;
}) {
  const [filter, setFilter] = useState<"all" | VatLine["status"]>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, Verified: 0, Warning: 0, Exception: 0 };
    rows.forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  function exportCsv() {
    const headers = ["Invoice", "Date", partyLabel, "TRN", "Description", "Net", "VAT", "Gross", "Nature", "Status", "Findings"];
    const csvRows = filtered.map((r) => [r.inv, r.date, r.party, r.trn, r.desc, r.net.toFixed(3), r.vat.toFixed(3), r.gross.toFixed(3), r.nature, r.status, r.findings.join(" | ")]);
    downloadCsv(exportName, toCsv(headers, csvRows));
  }

  return (
    <section style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
          <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={exportCsv} style={{ background: "#fff", border: "1px solid #cfd3d9", color: "#3a424c", padding: "7px 13px", borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
          Export CSV ↓
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              border: "1px solid " + (filter === f.key ? "var(--masthead)" : "#cfd3d9"),
              background: filter === f.key ? "var(--masthead)" : "#fff",
              color: filter === f.key ? "#fff" : "#3a424c",
              borderRadius: 5,
              padding: "6px 11px",
              fontSize: 11.5,
              cursor: "pointer",
            }}
          >
            {f.label} <b style={{ fontFamily: "var(--font-mono)" }}>{counts[f.key]}</b>
          </button>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1150, fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)", color: "var(--muted)", textAlign: "left" }}>
                {["Invoice", "Date", partyLabel, "TRN", "Description", "Net (excl.)", "VAT", "Total (incl.)", "Nature (AI)", "Verdict & findings"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 10px",
                      fontWeight: 600,
                      borderBottom: "1px solid #dfe2e6",
                      textAlign: i >= 5 && i <= 7 ? "right" : "left",
                      minWidth: h === "Description" ? 240 : h === "Verdict & findings" ? 220 : undefined,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const s = STATUS_STYLE[r.status];
                return (
                  <tr key={r.id}>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", borderBottom: "1px solid #eef0f2" }}>{r.inv}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", borderBottom: "1px solid #eef0f2" }}>{r.date}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2", whiteSpace: "nowrap" }}>{r.party}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", borderBottom: "1px solid #eef0f2", whiteSpace: "nowrap" }}>{r.trn}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2", color: "#3a424c", lineHeight: 1.45 }}>{r.desc}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", borderBottom: "1px solid #eef0f2", whiteSpace: "nowrap" }}>{r.net.toFixed(3)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", borderBottom: "1px solid #eef0f2", whiteSpace: "nowrap" }}>{r.vat.toFixed(3)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", borderBottom: "1px solid #eef0f2", whiteSpace: "nowrap" }}>{r.gross.toFixed(3)}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2" }}>
                      <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{r.nature}</span>
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2" }}>
                      <span style={{ background: s.bg, color: s.fg, borderRadius: 4, padding: "2px 7px", fontSize: 10.5, fontWeight: 600 }}>{r.status}</span>
                      {r.findings.length > 0 && (
                        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>{r.findings.join(" · ")}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--muted-soft)", fontSize: 12 }}>
            {rows.length === 0 ? "No data loaded yet — go to Data Sources to load or sample a register." : "No lines match this filter."}
          </div>
        )}
      </div>
    </section>
  );
}
