"use client";

import { useEffect, useState } from "react";
import { getAllOpportunities } from "@/lib/opportunities-data";
import { Opportunity } from "@/lib/types";
import { daysSince, formatDate, liveStatus, STATUS_LABEL, TYPE_LABEL } from "@/lib/helpers";
import {
  AuditLogEntry,
  SubmissionRecord,
  getArchivedIds,
  getAuditLog,
  getClickCounts,
  getSubmissions,
  getVerificationOverrides,
  logAudit,
  markVerifiedToday,
  toggleArchived,
  updateSubmissionStatus,
} from "@/lib/adminStore";
import ReviewQueueTab from "@/components/ReviewQueueTab";

function exportToCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "edurozgar-opportunities.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [archived, setArchived] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [clicks, setClicks] = useState<Record<string, number>>({});
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [tab, setTab] = useState<"listings" | "submissions" | "broken" | "queue" | "audit">("listings");
  const [hydrated, setHydrated] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  function refresh() {
    setArchived(getArchivedIds());
    setOverrides(getVerificationOverrides());
    setClicks(getClickCounts());
    setSubmissions(getSubmissions());
    setAudit(getAuditLog());
  }

  useEffect(() => {
    // Hydration from browser-only storage: must run after mount since it's unavailable during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    getAllOpportunities().then(setOpportunities);
    setHydrated(true);
  }, []);

  const brokenOrStale = opportunities.filter((o) => {
    const status = liveStatus(o);
    const verified = overrides[o.id] ?? o.last_verified_date;
    const staleDays = daysSince(verified);
    return status === "closed" || staleDays > 45;
  });

  if (!hydrated) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Loading admin panel…</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Admin Panel</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Demo administrator dashboard. Changes made here are stored only in this browser&apos;s local storage — a
          production deployment would back this with authenticated, server-side access control and a real database.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)]">
        {[
          { id: "listings", label: `Listings (${opportunities.length})` },
          { id: "queue", label: "Verification queue" },
          { id: "submissions", label: `Submissions (${submissions.filter((s) => s.status === "pending").length} pending)` },
          { id: "broken", label: `Broken / stale (${brokenOrStale.length})` },
          { id: "audit", label: "Audit log" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id ? "border-[var(--color-teal)] text-[var(--color-teal)]" : "border-transparent text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        <section>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  opportunities.map((o) => ({
                    id: o.id,
                    title: o.title,
                    type: o.opportunity_type,
                    provider: o.provider_name,
                    state: o.state,
                    status: liveStatus(o),
                    closing_date: o.closing_date,
                    last_verified: overrides[o.id] ?? o.last_verified_date,
                    official_application_url: o.official_application_url,
                    clicks: clicks[o.id] ?? 0,
                  }))
                )
              }
              className="rounded-md bg-[var(--color-teal)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Export to CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-[var(--color-navy)] text-white">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Closing</th>
                  <th className="px-3 py-2">Last verified</th>
                  <th className="px-3 py-2">Clicks</th>
                  <th className="px-3 py-2">Archived</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((o) => {
                  const isArchived = archived.includes(o.id);
                  return (
                    <tr key={o.id} className={`border-t border-[var(--color-border)] ${isArchived ? "opacity-50" : ""}`}>
                      <td className="px-3 py-2 font-medium">{o.title}</td>
                      <td className="px-3 py-2">{TYPE_LABEL[o.opportunity_type]}</td>
                      <td className="px-3 py-2">{STATUS_LABEL[liveStatus(o)]}</td>
                      <td className="px-3 py-2">{formatDate(o.closing_date)}</td>
                      <td className="px-3 py-2">{formatDate(overrides[o.id] ?? o.last_verified_date)}</td>
                      <td className="px-3 py-2">{clicks[o.id] ?? 0}</td>
                      <td className="px-3 py-2">{isArchived ? "Yes" : "No"}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            markVerifiedToday(o.id);
                            refresh();
                          }}
                          className="mr-2 text-[var(--color-teal)] hover:underline"
                        >
                          Mark verified
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleArchived(o.id);
                            refresh();
                          }}
                          className="text-red-600 hover:underline"
                        >
                          {isArchived ? "Unarchive" : "Archive"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "queue" && (
        <section>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Fed by the daily source-check job: official pages that changed, links that broke, and listings whose
            next_verification_date arrived. Nothing here has been auto-applied to the public listings — review each
            item against the real source before treating a change as confirmed.
          </p>
          <ReviewQueueTab />
        </section>
      )}

      {tab === "submissions" && (
        <section>
          {submissions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No suggested opportunities or outdated-info reports yet. Try submitting one from an opportunity detail
              page.
            </p>
          ) : (
            <ul className="space-y-3">
              {submissions.map((s) => (
                <li key={s.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {s.type === "suggestion" ? "Suggested opportunity" : "Outdated info report"}
                      {s.opportunityTitle ? ` — ${s.opportunityTitle}` : ""}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        s.status === "pending"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : s.status === "approved"
                          ? "border-teal-300 bg-teal-50 text-teal-800"
                          : "border-gray-300 bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <dl className="mt-2 grid gap-1 text-xs text-slate-600 dark:text-slate-300">
                    {Object.entries(s.data).map(([k, v]) => (
                      <div key={k}>
                        <span className="font-medium">{k}:</span> {v || "—"}
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-[11px] text-slate-400">Submitted {formatDate(s.submittedAt)}</p>
                  {s.status === "pending" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateSubmissionStatus(s.id, "approved");
                          logAudit(`Approved submission ${s.id}`);
                          refresh();
                        }}
                        className="rounded-md bg-[var(--color-teal)] px-3 py-1 text-xs font-semibold text-white"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateSubmissionStatus(s.id, "rejected");
                          logAudit(`Rejected submission ${s.id}`);
                          refresh();
                        }}
                        className="rounded-md border border-red-400 px-3 py-1 text-xs font-semibold text-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "broken" && (
        <section>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Listings that are closed, or whose verification is more than 45 days old, and need editor attention.
          </p>
          {brokenOrStale.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing needs attention right now.</p>
          ) : (
            <ul className="space-y-2">
              {brokenOrStale.map((o) => (
                <li key={o.id} className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                  <strong>{o.title}</strong> — {STATUS_LABEL[liveStatus(o)]}, last verified{" "}
                  {formatDate(overrides[o.id] ?? o.last_verified_date)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "audit" && (
        <section>
          {audit.length === 0 ? (
            <p className="text-sm text-slate-500">No admin actions recorded yet in this browser.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {audit.map((a) => (
                <li key={a.id} className="border-b border-[var(--color-border)] py-1.5">
                  <span className="text-slate-400">{formatDate(a.timestamp)}</span> — {a.action}{" "}
                  <span className="text-slate-400">({a.actor})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
