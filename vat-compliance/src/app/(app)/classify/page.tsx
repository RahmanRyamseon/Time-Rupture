"use client";

import { useMemo, useState } from "react";
import { useWorkpaper, type AiClassification } from "@/lib/workpaper/context";
import type { VatLine } from "@/lib/vat/types";

const BATCH_SIZE = 50;

function appliedTreatment(line: VatLine): string {
  if (line.net <= 0) return "N/A";
  const ratio = line.vat / line.net;
  if (Math.abs(ratio - 0.1) < 0.01) return "Standard-rated (10% charged)";
  if (Math.abs(ratio) < 0.01) return "Zero-rated / Exempt (no VAT charged)";
  return `Non-standard rate (${(ratio * 100).toFixed(1)}%)`;
}

export default function ClassifyPage() {
  const { apRows, arRows, aiClassifications, aiRunning, setAiClassifications, setAiRunning } = useWorkpaper();
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const allLines = useMemo(() => [...apRows, ...arRows], [apRows, arRows]);

  async function runAnalysis() {
    setError(null);
    setAiRunning(true);
    setProgress({ done: 0, total: allLines.length });

    try {
      for (let i = 0; i < allLines.length; i += BATCH_SIZE) {
        const batch = allLines.slice(i, i + BATCH_SIZE);
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: batch.map((l) => ({ id: l.id, desc: l.desc || l.party })) }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const { results } = (await res.json()) as {
          results: { id: string; classifiedNature: string; confidence: number; reasoning: string }[];
        };
        const withContext: AiClassification[] = results.map((r) => {
          const line = allLines.find((l) => l.id === r.id);
          const applied = line ? appliedTreatment(line) : "—";
          const expected = line?.nature ?? "—";
          return {
            lineId: r.id,
            classifiedNature: r.classifiedNature,
            expected,
            applied,
            match: r.classifiedNature === expected,
            confidence: r.confidence,
            reasoning: r.reasoning,
          };
        });
        setAiClassifications(withContext);
        setProgress((p) => ({ ...p, done: Math.min(p.total, i + batch.length) }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Classification failed.");
    } finally {
      setAiRunning(false);
    }
  }

  const results = allLines.map((l) => ({ line: l, cls: aiClassifications[l.id] })).filter((r) => r.cls);
  const mismatchCount = results.filter((r) => r.cls && !r.cls.match).length;
  const pct = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);

  return (
    <section style={{ padding: "20px 24px", maxWidth: 1180 }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Rate-vs-Nature Semantic Validation</div>
      <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 3, marginBottom: 16, maxWidth: 820 }}>
        Each line&apos;s actual nature is classified from its description by Claude, then compared to the treatment this
        workpaper&apos;s rule engine expected (Art. 53 zero-rate, Art. 54–55 exempt, Art. 42(C) blocked inputs, NBR food list) and to
        what was actually applied (VAT booked vs. net). Classification runs server-side — no API key ever reaches the browser.
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={runAnalysis}
            disabled={aiRunning || allLines.length === 0}
            style={{
              background: "var(--masthead)",
              color: "#eef0f3",
              border: "none",
              padding: "9px 16px",
              borderRadius: 5,
              fontWeight: 600,
              fontSize: 12,
              cursor: aiRunning || allLines.length === 0 ? "default" : "pointer",
              opacity: aiRunning || allLines.length === 0 ? 0.6 : 1,
            }}
          >
            {aiRunning ? "Running…" : "Run analysis"}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, background: "#eceef1", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--brand-soft)", transition: "width 0.2s" }} />
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 5, fontFamily: "var(--font-mono)" }}>
              {allLines.length === 0 ? "No lines loaded" : `${progress.done} / ${progress.total} classified`}
            </div>
          </div>
          <div style={{ textAlign: "right", paddingLeft: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{mismatchCount}</div>
            <div style={{ fontSize: 10, color: "var(--muted-soft)", letterSpacing: 0.5 }}>MISMATCHES</div>
          </div>
        </div>
        {error && <div style={{ marginTop: 10, background: "var(--danger-soft)", color: "var(--danger)", fontSize: 11.5, borderRadius: 5, padding: "8px 10px" }}>{error}</div>}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1080, fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)", color: "var(--muted)", textAlign: "left" }}>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Line</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", minWidth: 240 }}>Description</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Classified nature</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Expected</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Applied</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Match</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>Conf.</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", minWidth: 260 }}>Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {results.map(({ line, cls }) => (
                <tr key={line.id}>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", borderBottom: "1px solid #eef0f2" }}>{line.inv || line.id}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2", color: "#3a424c", lineHeight: 1.4 }}>{line.desc}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2" }}>{cls!.classifiedNature}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{cls!.expected}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{cls!.applied}</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2" }}>
                    <span
                      style={{
                        background: cls!.match ? "#e6f2ea" : "#f8e6e1",
                        color: cls!.match ? "#0f7a52" : "#b42318",
                        borderRadius: 4,
                        padding: "2px 7px",
                        fontSize: 10.5,
                        fontWeight: 600,
                      }}
                    >
                      {cls!.match ? "Match" : "Mismatch"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid #eef0f2", fontFamily: "var(--font-mono)" }}>{(cls!.confidence * 100).toFixed(0)}%</td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #eef0f2", color: "var(--muted)", lineHeight: 1.45 }}>{cls!.reasoning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {results.length === 0 && (
          <div style={{ padding: 30, textAlign: "center", color: "var(--muted-soft)", fontSize: 12 }}>
            {allLines.length === 0 ? "No data loaded yet — go to Data Sources first." : "Run the analysis to classify each line against the Regulations."}
          </div>
        )}
      </div>
    </section>
  );
}
