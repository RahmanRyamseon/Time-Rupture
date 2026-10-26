"use client";

import { useState } from "react";
import { useAppState } from "@/lib/store";

export function ExportDataControls() {
  const { hydrated, exportAllData, clearAllData } = useAppState();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);

  function handleExport() {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nuqati-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    clearAllData();
    setConfirming(false);
    setCleared(true);
  }

  if (!hydrated) return null;

  return (
    <div className="card-surface flex flex-col gap-3 rounded-2xl p-4 not-prose">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
        Exercise your rights, right now
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-strong"
        >
          Export my data (JSON)
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-surface-muted"
          >
            Clear my data
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/70">Delete everything on this device?</span>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              Yes, delete it
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {cleared && <p className="text-xs text-brand-strong">Done — this device&apos;s Nuqati data has been cleared.</p>}
    </div>
  );
}
