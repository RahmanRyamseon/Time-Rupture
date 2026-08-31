"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { cardById } from "@/data/cards";
import { MERCHANT_CATEGORIES } from "@/data/merchantCategories";
import { useAppState } from "@/lib/store";
import { parseStatement, optimizeStatement, type ParsedTransaction } from "@/lib/statement";
import { cardDisplayName, fmtBhd, fmtFils, fmtDate } from "@/lib/format";
import type { MerchantCategoryId } from "@/lib/types";

const SAMPLE_CSV = `date,description,amount,currency
2026-08-02,Lulu Hypermarket,32.500,BHD
2026-08-05,Talabat Order,8.200,BHD
2026-08-09,Amazon.sa,15.000,USD
2026-08-14,Bapco Fuel Station,20.000,BHD`;

export default function StatementPage() {
  const { cardIds, statementSummaries, addStatementSummary } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);

  const [csvText, setCsvText] = useState("");
  const [transactions, setTransactions] = useState<ParsedTransaction[] | null>(null);
  const [skippedRows, setSkippedRows] = useState(0);
  const [assignedCardId, setAssignedCardId] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const walletCards = useMemo(
    () => cardIds.map(cardById).filter((c): c is NonNullable<typeof c> => !!c),
    [cardIds],
  );

  const assignedCard = assignedCardId ? cardById(assignedCardId) : undefined;

  const result = useMemo(() => {
    if (!transactions || transactions.length === 0 || walletCards.length === 0) return null;
    return optimizeStatement(walletCards, transactions, assignedCard);
  }, [transactions, walletCards, assignedCard]);

  function handleParse(text: string) {
    const parsed = parseStatement(text);
    setTransactions(parsed.transactions);
    setSkippedRows(parsed.skippedRows);
    setSaved(false);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  }

  function updateTransaction(id: string, patch: Partial<ParsedTransaction>) {
    setTransactions((prev) => prev?.map((t) => (t.id === id ? { ...t, ...patch } : t)) ?? null);
    setSaved(false);
  }

  function handleSave() {
    if (!result || !assignedCard || !result.periodStart || !result.periodEnd) return;
    addStatementSummary({
      cardId: assignedCard.id,
      periodStart: result.periodStart.toISOString(),
      periodEnd: result.periodEnd.toISOString(),
      totalSpendBhd: result.totalSpendBhd,
      totalEarnedValueFils: result.totalActualNetFils,
      txnCount: result.perTransaction.length,
    });
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statement Import</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Import real transactions (not just an average spend profile) to see, purchase by purchase, what
          your assigned card actually earned versus what your best wallet card would have earned — caps
          and all, tracked chronologically the way a real billing cycle works.
        </p>
      </div>

      {walletCards.length === 0 ? (
        <EmptyWallet />
      ) : (
        <>
          <div className="card-surface flex flex-col gap-3 rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                Upload CSV
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <label className="flex items-center gap-2 text-sm">
                <span className="text-foreground/50">This statement is for</span>
                <select
                  value={assignedCardId}
                  onChange={(e) => setAssignedCardId(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 outline-none focus:border-brand"
                >
                  <option value="">Select a card…</option>
                  {walletCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {cardDisplayName(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <details className="text-xs text-foreground/50">
              <summary className="cursor-pointer select-none">Or paste CSV text · expected columns / sample</summary>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  handleParse(e.target.value);
                }}
                placeholder={SAMPLE_CSV}
                rows={5}
                className="mt-2 w-full rounded-lg border border-border bg-background p-2 font-mono text-xs outline-none focus:border-brand"
              />
              <p className="mt-1">
                Columns: <code>date</code>, <code>description</code>, <code>amount</code>, optional{" "}
                <code>currency</code> (anything other than BHD is treated as a foreign-currency purchase).
                Category is auto-detected from the description and can be corrected below.
              </p>
            </details>

            {transactions && (
              <p className="text-xs text-foreground/50">
                Parsed {transactions.length} transactions{skippedRows > 0 ? `, skipped ${skippedRows} unreadable/credit rows` : ""}.
              </p>
            )}
          </div>

          {!assignedCard && transactions && transactions.length > 0 && (
            <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">
              Pick which wallet card this statement belongs to above to see real-vs-optimal earnings.
            </p>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryTile label="Total spend" value={fmtBhd(result.totalSpendBhd)} />
                <SummaryTile
                  label={assignedCard ? `${assignedCard.bankShort} earned (net)` : "Optimal earned (net)"}
                  value={fmtFils(assignedCard ? result.totalActualNetFils : result.totalOptimalNetFils)}
                />
                {assignedCard && <SummaryTile label="Best-wallet earned (net)" value={fmtFils(result.totalOptimalNetFils)} />}
                {assignedCard && (
                  <SummaryTile
                    label="Left on the table"
                    value={fmtFils(result.totalLeftOnTableFils)}
                    highlight={result.totalLeftOnTableFils > 0}
                  />
                )}
              </div>

              {assignedCard && (
                <button
                  onClick={handleSave}
                  className="w-fit rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
                >
                  {saved ? "Saved to Fee-ROI tracker ✓" : "Save to Fee-ROI tracker"}
                </button>
              )}

              <div className="card-surface overflow-x-auto rounded-2xl p-4">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-foreground/50">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Amount</th>
                      {assignedCard && <th className="pb-2">{assignedCard.bankShort} earned</th>}
                      <th className="pb-2">Best card</th>
                      <th className="pb-2">Best earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.perTransaction.map((r) => (
                      <tr key={r.transaction.id} className="border-t border-border">
                        <td className="py-1.5 text-foreground/70">{fmtDate(r.transaction.date)}</td>
                        <td className="py-1.5">{r.transaction.description}</td>
                        <td className="py-1.5">
                          <select
                            value={r.transaction.category}
                            onChange={(e) =>
                              updateTransaction(r.transaction.id, { category: e.target.value as MerchantCategoryId })
                            }
                            className="rounded border border-border bg-background px-1 py-0.5 text-xs"
                          >
                            {MERCHANT_CATEGORIES.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nameEn}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5">{fmtBhd(r.transaction.amountBhd)}</td>
                        {assignedCard && (
                          <td className={`py-1.5 ${r.deltaFils > 1 ? "text-danger" : ""}`}>
                            {r.actualResult ? fmtFils(r.actualResult.netValueFils) : "—"}
                          </td>
                        )}
                        <td className="py-1.5 text-foreground/70">{cardDisplayName(r.card)}</td>
                        <td className="py-1.5 font-medium text-brand-strong">{fmtFils(r.netValueFils)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-foreground/40">
                Earned values are net of an estimated foreign-transaction fee (the card&apos;s own rate where
                published, otherwise ~2.5%) on any row flagged foreign-currency — a negative figure means the
                FX fee outweighed the rewards on that purchase.
              </p>
            </>
          )}

          {statementSummaries.length > 0 && (
            <p className="text-xs text-foreground/50">
              {statementSummaries.length} statement{statementSummaries.length === 1 ? "" : "s"} saved. See the{" "}
              <Link href="/fee-roi" className="font-medium text-brand-strong underline">
                Fee-ROI report
              </Link>
              .
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card-surface rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-danger" : "text-brand-strong"}`}>{value}</p>
    </div>
  );
}

function EmptyWallet() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="text-lg font-semibold">Your wallet is empty</p>
      <p className="mt-1 text-sm text-foreground/60">
        Add a few cards first so Nuqati has a wallet to optimize your statement against.
      </p>
      <Link
        href="/wallet"
        className="mt-4 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
      >
        Go to My Wallet
      </Link>
    </div>
  );
}
