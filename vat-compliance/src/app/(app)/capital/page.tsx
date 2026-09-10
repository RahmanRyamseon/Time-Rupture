"use client";

import { useState, type FormEvent } from "react";
import { useWorkpaper } from "@/lib/workpaper/context";
import { calcCapitalAsset } from "@/lib/vat/capital";
import type { Category } from "@/lib/vat/types";

export default function CapitalAssetsPage() {
  const { capitalAssets, addCapitalAsset, updateCapitalAssetPct, removeCapitalAsset } = useWorkpaper();
  const [form, setForm] = useState({
    asset: "",
    category: "Movable (5 yr)" as Category,
    nbv: "",
    inputVat: "",
    year: String(new Date().getFullYear()),
    basePct: "100",
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.asset.trim()) return;
    addCapitalAsset({
      asset: form.asset.trim(),
      category: form.category,
      inputVat: parseFloat(form.inputVat) || 0,
      basePct: parseFloat(form.basePct) || 100,
      curPct: parseFloat(form.basePct) || 100,
      firstUseYear: parseInt(form.year, 10) || new Date().getFullYear(),
    });
    setForm({ asset: "", category: "Movable (5 yr)", nbv: "", inputVat: "", year: String(new Date().getFullYear()), basePct: "100" });
  }

  const inputStyle = { border: "1px solid var(--border)", borderRadius: 4, padding: "6px 8px" } as const;
  const labelStyle = { display: "flex", flexDirection: "column" as const, gap: 3, fontSize: 10, color: "#6b7480", fontWeight: 600 };

  return (
    <section style={{ padding: "20px 24px", maxWidth: 1180 }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Capital Assets Adjustment Scheme — Article 47</div>
      <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 3, marginBottom: 16, maxWidth: 820 }}>
        Multi-year tracker for capital assets (not present in AP/AR exports — manual entry). Adjustment period is 5 years for
        movable assets and 10 years for real estate, running from the year of first use. An annual adjustment is triggered where
        the taxable-use proportion changes from the baseline.
      </div>

      <form onSubmit={onSubmit} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 10 }}>Register a capital asset</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={labelStyle}>
            Asset description
            <input value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} style={{ ...inputStyle, width: 210 }} />
          </label>
          <label style={labelStyle}>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} style={{ ...inputStyle, width: 190 }}>
              <option value="Movable (5 yr)">Movable (5 yr)</option>
              <option value="Real estate (10 yr)">Real estate (10 yr)</option>
            </select>
          </label>
          <label style={labelStyle}>
            Input VAT incurred
            <input value={form.inputVat} onChange={(e) => setForm({ ...form, inputVat: e.target.value })} style={{ ...inputStyle, width: 130, fontFamily: "var(--font-mono)" }} />
          </label>
          <label style={labelStyle}>
            Year of first use
            <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} style={{ ...inputStyle, width: 100, fontFamily: "var(--font-mono)" }} />
          </label>
          <label style={labelStyle}>
            Baseline taxable use %
            <input value={form.basePct} onChange={(e) => setForm({ ...form, basePct: e.target.value })} style={{ ...inputStyle, width: 130, fontFamily: "var(--font-mono)" }} />
          </label>
          <button type="submit" style={{ background: "var(--masthead)", color: "#eef0f3", border: "none", padding: "8px 15px", borderRadius: 5, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Add asset
          </button>
        </div>
      </form>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 980, fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)", color: "var(--muted)", textAlign: "left" }}>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Asset</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Category</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>Input VAT</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>Base use %</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>This-yr use %</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>Annual slice</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6", textAlign: "right" }}>Adjustment</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Trigger</th>
                <th style={{ padding: "9px 10px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}></th>
              </tr>
            </thead>
            <tbody>
              {capitalAssets.map((c) => {
                const { slice, adjustment, trigger } = calcCapitalAsset(c);
                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid #eef0f2" }}>
                    <td style={{ padding: "8px 10px" }}>{c.asset}</td>
                    <td style={{ padding: "8px 10px", fontSize: 10.5, color: "var(--muted)" }}>{c.category}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{c.inputVat.toFixed(3)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{c.basePct.toFixed(1)}</td>
                    <td style={{ padding: "5px 10px", textAlign: "right" }}>
                      <input
                        value={c.curPct}
                        onChange={(e) => updateCapitalAssetPct(c.id, parseFloat(e.target.value) || 0)}
                        style={{ border: "1px solid var(--border)", borderRadius: 4, padding: "4px 6px", width: 64, textAlign: "right", fontFamily: "var(--font-mono)" }}
                      />
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)" }}>{slice.toFixed(3)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", color: adjustment < 0 ? "var(--danger)" : adjustment > 0 ? "var(--brand)" : undefined }}>
                      {adjustment.toFixed(3)}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {trigger ? (
                        <span style={{ background: "#fdf3d8", color: "#8a6100", borderRadius: 4, padding: "2px 7px", fontSize: 10.5, fontWeight: 600 }}>Adjust</span>
                      ) : (
                        <span style={{ color: "var(--muted-soft)", fontSize: 10.5 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <button onClick={() => removeCapitalAsset(c.id)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 14 }}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {capitalAssets.length === 0 && (
          <div style={{ padding: 30, textAlign: "center", color: "var(--muted-soft)", fontSize: 12 }}>No capital assets registered yet.</div>
        )}
      </div>
    </section>
  );
}
