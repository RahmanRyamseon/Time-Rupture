"use client";

import { useRef, useState, type DragEvent } from "react";
import { useWorkpaper } from "@/lib/workpaper/context";
import { parseWorkbook } from "@/lib/vat/xlsx";
import { SAMPLE_AP, SAMPLE_AR } from "@/lib/vat/sample";

const PIPELINE_STEPS = [
  { step: "01", title: "Load AP / AR", desc: "Drop .xlsx registers — columns are auto-detected and rows auto-classified as AP or AR." },
  { step: "02", title: "Verify each line", desc: "10% VAT tie-out, TRN format, blocked inputs, reverse charge, tax point, completeness, duplicates, FX." },
  { step: "03", title: "Classify nature (AI)", desc: "Each line's actual nature is classified from its description and compared to the treatment applied." },
  { step: "04", title: "Map to VAT return", desc: "Verified lines roll up into NBR return boxes for filing reconciliation." },
];

function DropZone({
  label,
  badge,
  badgeColor,
  fileName,
  statusInfo,
  onFile,
  onLoadSample,
  onClear,
}: {
  label: string;
  badge: string;
  badgeColor: string;
  fileName: string;
  statusInfo: string;
  onFile: (file: File) => void;
  onLoadSample: () => void;
  onClear: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
      <div style={{ padding: "11px 15px", borderBottom: "1px solid #e3e6ea", display: "flex", alignItems: "center", gap: 8, background: "var(--surface-muted)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, background: badgeColor, color: badgeColor === "#e7edfb" ? "#2f5fd0" : "#0f7a52", padding: "2px 7px", borderRadius: 3 }}>
          {badge}
        </span>
        <span style={{ fontWeight: 600, fontSize: 12.5 }}>{label}</span>
      </div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: "26px 15px",
          cursor: "pointer",
          background: dragOver ? "var(--link-soft)" : "transparent",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
        <div style={{ fontSize: 24, color: "#aab1bb" }}>⤓</div>
        <div style={{ fontWeight: 600, fontSize: 12.5, color: "#3a424c" }}>Drop .xlsx or click to browse</div>
        <div style={{ fontSize: 11, color: "var(--muted-soft)", fontFamily: "var(--font-mono)" }}>{fileName}</div>
      </label>
      {statusInfo && <div style={{ padding: "6px 15px", fontSize: 10.5, color: "var(--muted)", borderTop: "1px solid #eef0f2" }}>{statusInfo}</div>}
      <div style={{ display: "flex", gap: 8, padding: "10px 15px", borderTop: "1px solid #e3e6ea", background: "#fafbfc" }}>
        <button onClick={onLoadSample} style={{ background: "var(--link)", color: "#fff", border: "none", padding: "7px 12px", borderRadius: 5, fontWeight: 600, fontSize: 11.5, cursor: "pointer" }}>
          Load sample
        </button>
        <button onClick={onClear} style={{ background: "#fff", color: "var(--muted)", border: "1px solid #cfd3d9", padding: "7px 12px", borderRadius: 5, fontWeight: 500, fontSize: 11.5, cursor: "pointer" }}>
          Clear
        </button>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const { apRows, arRows, apFileName, arFileName, loadAp, loadAr, clearAp, clearAr, clearAll, saveStatus, saveError, saveWorkpaper } = useWorkpaper();
  const [apInfo, setApInfo] = useState("");
  const [arInfo, setArInfo] = useState("");

  async function handleApFile(file: File) {
    const parsed = await parseWorkbook(file);
    if (parsed.kind === "ar") {
      setApInfo(`This looks like an AR register (customer columns detected) — use the AR zone instead.`);
      return;
    }
    loadAp(parsed.rows.map((r) => ({ ...r, party: r.party })), file.name);
    setApInfo(`Header row ${parsed.headerRowIndex + 1} · ${parsed.matchedFieldCount} columns matched · ${parsed.rows.length} rows`);
  }

  async function handleArFile(file: File) {
    const parsed = await parseWorkbook(file);
    if (parsed.kind === "ap") {
      setArInfo(`This looks like an AP register (supplier columns detected) — use the AP zone instead.`);
      return;
    }
    loadAr(parsed.rows, file.name);
    setArInfo(`Header row ${parsed.headerRowIndex + 1} · ${parsed.matchedFieldCount} columns matched · ${parsed.rows.length} rows`);
  }

  function loadSampleAp() {
    loadAp(
      SAMPLE_AP.map((r) => ({ invoice: r.invoice, date: r.date, party: r.party, trn: r.trn, description: r.description, net: r.net, vat: r.vat, gross: r.gross, country: r.country, currency: r.currency })),
      "sample-ap.xlsx"
    );
    setApInfo(`${SAMPLE_AP.length} sample rows loaded`);
  }

  function loadSampleAr() {
    loadAr(
      SAMPLE_AR.map((r) => ({ invoice: r.invoice, date: r.date, party: r.party, trn: r.trn, description: r.description, net: r.net, vat: r.vat, gross: r.gross, country: r.country, currency: r.currency })),
      "sample-ar.xlsx"
    );
    setArInfo(`${SAMPLE_AR.length} sample rows loaded`);
  }

  return (
    <section style={{ padding: "26px 30px", maxWidth: 1180 }}>
      <div style={{ marginBottom: 6, fontSize: 19, fontWeight: 600 }}>Data Sources</div>
      <div style={{ color: "var(--muted)", fontSize: 12.5, marginBottom: 22, maxWidth: 720 }}>
        Load your AP (purchases) and AR (sales) registers as <b>.xlsx</b>. Each file is auto-classified as AP or AR by its column
        names — drop it in either zone and it routes itself. Columns are matched by header name (case, spacing and order don&apos;t
        matter; common renames are recognised) and the header row is auto-detected. Use <b>Load sample</b> to try the tool with
        illustrative data. Nothing is uploaded anywhere — parsing happens entirely in your browser.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DropZone
          label="AP Invoice Details Report"
          badge="INPUT VAT"
          badgeColor="#e7edfb"
          fileName={apFileName || "No file loaded"}
          statusInfo={apInfo}
          onFile={handleApFile}
          onLoadSample={loadSampleAp}
          onClear={() => {
            clearAp();
            setApInfo("");
          }}
        />
        <DropZone
          label="AR VAT Register Report"
          badge="OUTPUT VAT"
          badgeColor="#e6f2ea"
          fileName={arFileName || "No file loaded"}
          statusInfo={arInfo}
          onFile={handleArFile}
          onLoadSample={loadSampleAr}
          onClear={() => {
            clearAr();
            setArInfo("");
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
        <button
          onClick={() => {
            clearAll();
            setApInfo("");
            setArInfo("");
          }}
          style={{ background: "#fff", color: "var(--muted)", border: "1px solid #cfd3d9", padding: "9px 15px", borderRadius: 5, fontWeight: 500, fontSize: 12, cursor: "pointer" }}
        >
          Clear all
        </button>
        <span style={{ color: "var(--muted-soft)", fontSize: 11.5 }}>
          {apRows.length} AP line(s) · {arRows.length} AR line(s) loaded
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={saveWorkpaper}
          disabled={saveStatus === "saving" || (apRows.length === 0 && arRows.length === 0)}
          style={{
            background: "var(--brand)",
            color: "#fff",
            border: "none",
            padding: "9px 15px",
            borderRadius: 5,
            fontWeight: 600,
            fontSize: 12,
            cursor: saveStatus === "saving" ? "default" : "pointer",
            opacity: saveStatus === "saving" || (apRows.length === 0 && arRows.length === 0) ? 0.6 : 1,
          }}
        >
          {saveStatus === "saving" ? "Saving…" : "Save workpaper"}
        </button>
        {saveStatus === "saved" && <span style={{ color: "var(--brand)", fontSize: 11.5 }}>Saved ✓</span>}
        {saveStatus === "error" && <span style={{ color: "var(--danger)", fontSize: 11.5 }}>{saveError}</span>}
      </div>

      <div style={{ marginTop: 26, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "16px 18px" }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 10 }}>Verification pipeline</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {PIPELINE_STEPS.map((p) => (
            <div key={p.step} style={{ border: "1px solid #e3e6ea", borderRadius: 5, padding: "11px 12px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted-soft)", marginBottom: 3 }}>{p.step}</div>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{p.title}</div>
              <div style={{ fontSize: 10.5, color: "#6b7480", lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
