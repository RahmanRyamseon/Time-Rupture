"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { verifyLine, detectDuplicates, type Side } from "@/lib/vat/rules";
import { toIsoDate, toNumber, type ParsedRow } from "@/lib/vat/xlsx";
import type { CapitalAsset, VatLine } from "@/lib/vat/types";

let nextId = 1;
function freshId(prefix: string) {
  return `${prefix}${nextId++}`;
}

// Everything in this workpaper is persisted only to this browser's
// localStorage — nothing is ever sent to a server. (The one exception is
// the AI classify pass on /classify, which sends just the lines being
// classified to whichever AI provider is configured, and only when the
// user explicitly runs it — see src/app/api/classify/route.ts.)
const STORAGE_KEY = "vat-compliance:workpaper:v1";

interface PersistedWorkpaper {
  nextId: number;
  periodLabel: string;
  apFileName: string;
  arFileName: string;
  apRows: VatLine[];
  arRows: VatLine[];
  capitalAssets: CapitalAsset[];
  returnFiled: Record<string, number | null>;
  aiClassifications: Record<string, AiClassification>;
}

function loadFromStorage(): PersistedWorkpaper | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedWorkpaper) : null;
  } catch {
    // Private browsing / storage blocked / corrupt data — start empty.
    return null;
  }
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
  const hydrated = useRef(false);

  // Hydrate from this browser's localStorage once, on first mount only.
  // window.localStorage doesn't exist during SSR, so this can only happen
  // client-side after mount — an effect is the correct place for it, and
  // the resulting extra render pass is a one-time, unavoidable cost of
  // syncing from that external store.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = loadFromStorage();
    if (!saved) return;
    nextId = saved.nextId;
    setPeriodLabel(saved.periodLabel);
    setApFileName(saved.apFileName);
    setArFileName(saved.arFileName);
    setApRows(saved.apRows);
    setArRows(saved.arRows);
    setCapitalAssets(saved.capitalAssets);
    setReturnFiled(saved.returnFiled);
    setAiClassificationsState(saved.aiClassifications);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function saveWorkpaper() {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const snapshot: PersistedWorkpaper = {
        nextId,
        periodLabel,
        apFileName,
        arFileName,
        apRows,
        arRows,
        capitalAssets,
        returnFiled,
        aiClassifications,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      setSaveError("Could not save — this browser's storage may be full or blocked (e.g. private browsing).");
    }
    return Promise.resolve();
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
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Storage blocked — nothing to clean up.
        }
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
