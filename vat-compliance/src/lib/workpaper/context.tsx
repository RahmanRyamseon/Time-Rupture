"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { verifyLine, detectDuplicates, type Side } from "@/lib/vat/rules";
import { toIsoDate, toNumber, type ParsedRow } from "@/lib/vat/xlsx";
import type { CapitalAsset, VatLine } from "@/lib/vat/types";
import { createClient } from "@/lib/supabase/client";

let nextId = 1;
function freshId(prefix: string) {
  return `${prefix}${nextId++}`;
}

function buildLines(rows: ParsedRow[], side: Side, periodStart?: string, periodEnd?: string): VatLine[] {
  const drafts = rows.map((r) => ({
    inv: r.invoice.trim(),
    date: toIsoDate(r.date),
    party: r.party.trim(),
    trn: r.trn.trim(),
    desc: r.description.trim(),
    net: toNumber(r.net),
    vat: toNumber(r.vat),
    gross: toNumber(r.gross),
    country: r.country.trim(),
    lineCurrency: r.currency.trim() || "BHD",
  }));

  const dupIndices = detectDuplicates(drafts);

  return drafts.map((d, i) => {
    const { nature, status, findings } = verifyLine(d, side, { periodStart, periodEnd });
    const allFindings = dupIndices.has(i) ? [...findings, "Duplicate invoice detected (same invoice, party and amounts)."] : findings;
    return {
      id: freshId(side),
      ...d,
      nature,
      status: dupIndices.has(i) ? "Exception" : status,
      findings: allFindings,
    };
  });
}

export interface AiClassification {
  lineId: string;
  classifiedNature: string;
  expected: string;
  applied: string;
  match: boolean;
  confidence: number;
  reasoning: string;
}

interface WorkpaperState {
  periodLabel: string;
  currency: string;
  apFileName: string;
  arFileName: string;
  apRows: VatLine[];
  arRows: VatLine[];
  capitalAssets: CapitalAsset[];
  returnFiled: Record<string, number | null>;
  aiClassifications: Record<string, AiClassification>;
  aiRunning: boolean;
}

interface WorkpaperContextValue extends WorkpaperState {
  loadAp: (rows: ParsedRow[], fileName: string) => void;
  loadAr: (rows: ParsedRow[], fileName: string) => void;
  clearAp: () => void;
  clearAr: () => void;
  clearAll: () => void;
  addCapitalAsset: (asset: Omit<CapitalAsset, "id">) => void;
  updateCapitalAssetPct: (id: string, curPct: number) => void;
  removeCapitalAsset: (id: string) => void;
  setFiledVat: (box: string, value: number | null) => void;
  setAiClassifications: (results: AiClassification[]) => void;
  setAiRunning: (running: boolean) => void;
  setPeriodLabel: (label: string) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  saveWorkpaper: () => Promise<void>;
}

const WorkpaperContext = createContext<WorkpaperContextValue | null>(null);

export function WorkpaperProvider({ children }: { children: ReactNode }) {
  const [periodLabel, setPeriodLabel] = useState("Aug 2026");
  const [currency] = useState("BHD");
  const [apFileName, setApFileName] = useState("");
  const [arFileName, setArFileName] = useState("");
  const [apRows, setApRows] = useState<VatLine[]>([]);
  const [arRows, setArRows] = useState<VatLine[]>([]);
  const [capitalAssets, setCapitalAssets] = useState<CapitalAsset[]>([]);
  const [returnFiled, setReturnFiled] = useState<Record<string, number | null>>({});
  const [aiClassifications, setAiClassificationsState] = useState<Record<string, AiClassification>>({});
  const [aiRunning, setAiRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveWorkpaper() {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      // owner_id is set explicitly to auth.uid() here and RLS's "with check"
      // on workpapers/insert rejects anything else — a client cannot save a
      // workpaper under another user's id even if it tried.
      const { data: workpaper, error: wpError } = await supabase
        .from("workpapers")
        .insert({ owner_id: user.id, period_label: periodLabel, currency })
        .select("id")
        .single();
      if (wpError || !workpaper) throw new Error(wpError?.message || "Could not create workpaper.");

      const workpaperId = workpaper.id as string;

      const toInputRow = (l: VatLine) => ({
        workpaper_id: workpaperId,
        inv: l.inv,
        line_date: l.date || null,
        supplier: l.party,
        trn: l.trn,
        description: l.desc,
        net: l.net,
        vat: l.vat,
        gross: l.gross,
        nature: l.nature,
        status: l.status,
        findings: l.findings,
      });
      const toOutputRow = (l: VatLine) => ({
        workpaper_id: workpaperId,
        inv: l.inv,
        line_date: l.date || null,
        customer: l.party,
        trn: l.trn,
        description: l.desc,
        net: l.net,
        vat: l.vat,
        gross: l.gross,
        nature: l.nature,
        status: l.status,
        findings: l.findings,
      });

      if (apRows.length > 0) {
        const { error } = await supabase.from("input_vat_lines").insert(apRows.map(toInputRow));
        if (error) throw new Error(error.message);
      }
      if (arRows.length > 0) {
        const { error } = await supabase.from("output_vat_lines").insert(arRows.map(toOutputRow));
        if (error) throw new Error(error.message);
      }
      if (capitalAssets.length > 0) {
        const { error } = await supabase.from("capital_assets").insert(
          capitalAssets.map((a) => ({
            workpaper_id: workpaperId,
            asset: a.asset,
            category: a.category,
            input_vat: a.inputVat,
            base_pct: a.basePct,
            cur_pct: a.curPct,
            first_use_year: a.firstUseYear,
          }))
        );
        if (error) throw new Error(error.message);
      }
      const filedEntries = Object.entries(returnFiled).filter(([, v]) => v !== null);
      if (filedEntries.length > 0) {
        const { error } = await supabase.from("return_boxes").insert(
          filedEntries.map(([box, filed_vat]) => ({ workpaper_id: workpaperId, box, filed_vat }))
        );
        if (error) throw new Error(error.message);
      }

      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("error");
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  const value = useMemo<WorkpaperContextValue>(
    () => ({
      periodLabel,
      currency,
      apFileName,
      arFileName,
      apRows,
      arRows,
      capitalAssets,
      returnFiled,
      aiClassifications,
      aiRunning,
      loadAp: (rows, fileName) => {
        setApRows(buildLines(rows, "ap"));
        setApFileName(fileName);
      },
      loadAr: (rows, fileName) => {
        setArRows(buildLines(rows, "ar"));
        setArFileName(fileName);
      },
      clearAp: () => {
        setApRows([]);
        setApFileName("");
      },
      clearAr: () => {
        setArRows([]);
        setArFileName("");
      },
      clearAll: () => {
        setApRows([]);
        setArRows([]);
        setApFileName("");
        setArFileName("");
        setCapitalAssets([]);
        setReturnFiled({});
        setAiClassificationsState({});
      },
      addCapitalAsset: (asset) => setCapitalAssets((prev) => [...prev, { ...asset, id: freshId("cap") }]),
      updateCapitalAssetPct: (id, curPct) =>
        setCapitalAssets((prev) => prev.map((a) => (a.id === id ? { ...a, curPct } : a))),
      removeCapitalAsset: (id) => setCapitalAssets((prev) => prev.filter((a) => a.id !== id)),
      setFiledVat: (box, val) => setReturnFiled((prev) => ({ ...prev, [box]: val })),
      setAiClassifications: (results) =>
        setAiClassificationsState((prev) => {
          const next = { ...prev };
          for (const r of results) next[r.lineId] = r;
          return next;
        }),
      setAiRunning,
      setPeriodLabel,
      saveStatus,
      saveError,
      saveWorkpaper,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodLabel, currency, apFileName, arFileName, apRows, arRows, capitalAssets, returnFiled, aiClassifications, aiRunning, saveStatus, saveError]
  );

  return <WorkpaperContext.Provider value={value}>{children}</WorkpaperContext.Provider>;
}

export function useWorkpaper(): WorkpaperContextValue {
  const ctx = useContext(WorkpaperContext);
  if (!ctx) throw new Error("useWorkpaper must be used within a WorkpaperProvider");
  return ctx;
}
