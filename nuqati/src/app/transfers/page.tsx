"use client";

import { useMemo, useState } from "react";
import { TRANSFER_PARTNERS } from "@/data/transferPartners";
import { LOYALTY_PROGRAMS, programById } from "@/data/loyaltyPrograms";
import { fmtFils, fmtPoints } from "@/lib/format";

export default function TransfersPage() {
  const active = TRANSFER_PARTNERS.filter((t) => t.isActive);
  const inactive = TRANSFER_PARTNERS.filter((t) => !t.isActive);

  const [fromId, setFromId] = useState(active[0]?.fromProgramId ?? "");
  const [toId, setToId] = useState(active[0]?.toProgramId ?? "");
  const [points, setPoints] = useState(20000);

  const availableTargets = useMemo(() => active.filter((t) => t.fromProgramId === fromId), [active, fromId]);
  const link = active.find((t) => t.fromProgramId === fromId && t.toProgramId === toId) ?? availableTargets[0];

  const fromProgram = programById(fromId);
  const toProgram = link ? programById(link.toProgramId) : undefined;
  const resultingUnits = link?.ratioFromPerTo ? points / link.ratioFromPerTo : undefined;
  const toBest = toProgram
    ? Math.max(...toProgram.redemptionOptions.map((o) => o.valuePerPointFils))
    : undefined;
  const resultingValueFils = resultingUnits !== undefined && toBest !== undefined ? resultingUnits * toBest : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfer Partner Navigator</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Every Bahrain bank points program mapped to its airline &amp; retail transfer partners — the
          intelligence layer no comparison site maintains.
        </p>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <p className="mb-3 text-sm font-semibold">Transfer simulator</p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From">
            <select
              value={fromId}
              onChange={(e) => {
                setFromId(e.target.value);
                const next = active.find((t) => t.fromProgramId === e.target.value);
                if (next) setToId(next.toProgramId);
              }}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
            >
              {Array.from(new Set(active.map((t) => t.fromProgramId))).map((id) => (
                <option key={id} value={id}>
                  {programById(id)?.name ?? id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Points">
            <input
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(Math.max(0, Number(e.target.value) || 0))}
              className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
          </Field>
          <Field label="To">
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
            >
              {availableTargets.map((t) => (
                <option key={t.toProgramId} value={t.toProgramId}>
                  {programById(t.toProgramId)?.name ?? t.toProgramId}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {link && (
          <div className="mt-4 rounded-xl bg-brand-soft p-3 text-sm">
            <p>
              {fmtPoints(points)} {fromProgram?.currencyName} → {link.ratioFromPerTo ? fmtPoints(resultingUnits ?? 0) : "—"}{" "}
              {toProgram?.currencyName} <span className="text-foreground/50">({link.ratioLabel})</span>
            </p>
            {resultingValueFils !== undefined && (
              <p className="mt-1 font-semibold text-brand-strong">
                Best redemption value: {fmtFils(resultingValueFils)}
              </p>
            )}
            {link.sweetSpot && <p className="mt-1 text-xs text-foreground/60">Sweet spot: {link.sweetSpot}</p>}
            <p className="mt-1 text-xs text-foreground/50">
              Min transfer {link.minTransfer ?? "—"} · takes {link.transferTimeDays ?? "—"}
            </p>
          </div>
        )}
      </div>

      <div className="card-surface overflow-x-auto rounded-2xl p-4">
        <p className="mb-3 text-sm font-semibold">Full transfer map</p>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-foreground/50">
              <th className="pb-2">Bank program</th>
              <th className="pb-2">Transfers to</th>
              <th className="pb-2">Ratio</th>
              <th className="pb-2">Min transfer</th>
              <th className="pb-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {active.map((t, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2 font-medium">{programById(t.fromProgramId)?.name}</td>
                <td className="py-2">{programById(t.toProgramId)?.name}</td>
                <td className="py-2 text-foreground/70">{t.ratioLabel}</td>
                <td className="py-2 text-foreground/70">{t.minTransfer ?? "—"}</td>
                <td className="py-2 text-foreground/70">{t.transferTimeDays ?? "—"}</td>
              </tr>
            ))}
            {inactive.map((t, i) => (
              <tr key={`inactive-${i}`} className="border-t border-border opacity-50">
                <td className="py-2 font-medium">{programById(t.fromProgramId)?.name}</td>
                <td className="py-2" colSpan={4}>
                  {t.ratioLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-surface rounded-2xl p-4">
        <p className="mb-3 text-sm font-semibold">All Bahrain-reachable loyalty programs</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LOYALTY_PROGRAMS.map((p) => (
            <div key={p.id} className="rounded-xl border border-border px-3 py-2 text-sm">
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-foreground/50">{p.operator}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</span>
      {children}
    </div>
  );
}
