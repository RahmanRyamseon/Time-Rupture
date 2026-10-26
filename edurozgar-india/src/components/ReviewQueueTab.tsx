"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/helpers";

interface ReviewQueueItem {
  id: string;
  opportunity_id: string | null;
  source_check_id: string | null;
  reason: "content_changed" | "link_broken" | "verification_due" | "user_report" | "user_suggestion";
  detail: Record<string, unknown>;
  status: "pending" | "applied" | "dismissed";
  created_at: string;
}

const REASON_LABEL: Record<ReviewQueueItem["reason"], string> = {
  content_changed: "Official page changed",
  link_broken: "Link broken or unreachable",
  verification_due: "Re-verification due",
  user_report: "Visitor reported outdated info",
  user_suggestion: "Visitor-suggested opportunity",
};

const TOKEN_KEY = "edurozgar-admin-token";

export default function ReviewQueueTab() {
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewQueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Hydration from browser-only storage: must run after mount since it's unavailable during SSR.
    try {
      const stored = window.localStorage.getItem(TOKEN_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(stored);
    } catch {
      // ignore
    }
  }, []);

  async function load(withToken: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/review-queue", { headers: { "x-admin-token": withToken } });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
        setItems(null);
        return;
      }
      setItems(json.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) load(token);
  }, [token]);

  function promptForToken() {
    const value = window.prompt(
      "Admin API token (ADMIN_API_TOKEN on the server). This is a demo stopgap, not real login — see README."
    );
    if (!value) return;
    setToken(value);
    try {
      window.localStorage.setItem(TOKEN_KEY, value);
    } catch {
      // ignore
    }
  }

  async function resolve(id: string, action: "applied" | "dismissed") {
    if (!token) return;
    await fetch("/api/admin/review-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id, action }),
    });
    load(token);
  }

  if (!token) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-sm">
        <p className="mb-3 text-slate-600 dark:text-slate-300">
          The verification queue is fed by the daily source-check job and lives in Supabase, behind the
          service-role key — it needs the admin API token to load.
        </p>
        <button type="button" onClick={promptForToken} className="rounded-md bg-[var(--color-teal)] px-3 py-1.5 text-xs font-semibold text-white">
          Enter admin token
        </button>
      </div>
    );
  }

  if (loading && !items) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error)
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
        {error}
        {error.includes("SUPABASE_SERVICE_ROLE_KEY") && (
          <p className="mt-1 text-xs">Set SUPABASE_SERVICE_ROLE_KEY and ADMIN_API_TOKEN in .env.local — see .env.example.</p>
        )}
      </div>
    );
  if (!items || items.length === 0) return <p className="text-sm text-slate-500">Nothing pending review right now.</p>;

  const pending = items.filter((i) => i.status === "pending");
  const resolved = items.filter((i) => i.status !== "pending").slice(0, 20);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          Pending ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending review right now.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((item) => (
              <li key={item.id} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {REASON_LABEL[item.reason]}
                    {item.opportunity_id ? ` — ${item.opportunity_id}` : ""}
                  </span>
                  <span className="text-xs text-amber-700">{formatDate(item.created_at)}</span>
                </div>
                <pre className="mt-2 overflow-x-auto rounded bg-white/60 p-2 text-[11px]">
                  {JSON.stringify(item.detail, null, 2)}
                </pre>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => resolve(item.id, "applied")}
                    className="rounded-md bg-[var(--color-teal)] px-3 py-1 text-xs font-semibold text-white"
                  >
                    Mark as handled
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(item.id, "dismissed")}
                    className="rounded-md border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-800"
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {resolved.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Recently resolved</h3>
          <ul className="space-y-1 text-xs text-slate-500">
            {resolved.map((item) => (
              <li key={item.id}>
                {formatDate(item.created_at)} — {REASON_LABEL[item.reason]}
                {item.opportunity_id ? ` (${item.opportunity_id})` : ""} — {item.status}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
