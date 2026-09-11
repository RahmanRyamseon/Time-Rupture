"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { opportunities } from "@/lib/data/opportunities";
import { getSavedIds, toggleSaved } from "@/lib/savedOpportunities";
import { daysUntil, formatDate } from "@/lib/helpers";
import OpportunityCard from "@/components/OpportunityCard";

interface Prefs {
  email: string;
  mobile: string;
  stateAlerts: string[];
  minorityAlerts: boolean;
  newScholarshipAlerts: boolean;
  newJobAlerts: boolean;
  admissionAlerts: boolean;
}

const PREFS_KEY = "edurozgar-dashboard-prefs";
const APP_STATUS_KEY = "edurozgar-application-status";

const DEFAULT_PREFS: Prefs = {
  email: "",
  mobile: "",
  stateAlerts: [],
  minorityAlerts: false,
  newScholarshipAlerts: true,
  newJobAlerts: true,
  admissionAlerts: false,
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

type AppStatus = "not_started" | "in_progress" | "submitted" | "result_awaited";

const STATUS_OPTIONS: { value: AppStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "result_awaited", label: "Result awaited" },
];

export default function DashboardPage() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [statusMap, setStatusMap] = useState<Record<string, AppStatus>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydration from browser-only storage: must run after mount since it's unavailable during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedIds(getSavedIds());
    setPrefs(loadPrefs());
    try {
      const raw = window.localStorage.getItem(APP_STATUS_KEY);
      if (raw) setStatusMap(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function savePrefs(next: Prefs) {
    setPrefs(next);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function setStatus(id: string, status: AppStatus) {
    const next = { ...statusMap, [id]: status };
    setStatusMap(next);
    try {
      window.localStorage.setItem(APP_STATUS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function deleteAccount() {
    if (!confirm("This clears all locally saved opportunities, preferences and status tracking from this browser. Continue?")) return;
    try {
      window.localStorage.removeItem(PREFS_KEY);
      window.localStorage.removeItem(APP_STATUS_KEY);
      window.localStorage.removeItem("edurozgar-saved-opportunities");
    } catch {
      // ignore
    }
    setSavedIds([]);
    setPrefs(DEFAULT_PREFS);
    setStatusMap({});
  }

  function downloadChecklist() {
    const saved = opportunities.filter((o) => savedIds.includes(o.id));
    const lines = [
      "EduRozgar India — Personal Application Checklist",
      `Generated: ${new Date().toLocaleDateString("en-IN")}`,
      "",
      ...saved.flatMap((o) => [
        `${o.title} (${o.provider_name})`,
        `  Last date: ${formatDate(o.closing_date)}`,
        `  Documents: ${o.required_documents.join(", ") || "See official notification"}`,
        `  Official application: ${o.official_application_url}`,
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "edurozgar-application-checklist.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const saved = opportunities.filter((o) => savedIds.includes(o.id));
  const upcomingDeadlines = [...saved].sort((a, b) => daysUntil(a.closing_date) - daysUntil(b.closing_date));

  if (!hydrated) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Loading your dashboard…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">My Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Registration is optional. Data on this page is stored only in your browser for this demo build — nothing is
          sent to a server, and no religion or sensitive personal data is collected or required.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <h2 className="mb-3 text-lg font-bold">Optional registration & alert preferences</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Email (optional)</span>
            <input
              type="email"
              value={prefs.email}
              onChange={(e) => savePrefs({ ...prefs, email: e.target.value })}
              className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Mobile number (optional)</span>
            <input
              type="tel"
              value={prefs.mobile}
              onChange={(e) => savePrefs({ ...prefs, mobile: e.target.value })}
              className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              placeholder="+91"
            />
          </label>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={prefs.newScholarshipAlerts}
              onChange={(e) => savePrefs({ ...prefs, newScholarshipAlerts: e.target.checked })}
            />
            New scholarship alerts
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={prefs.newJobAlerts}
              onChange={(e) => savePrefs({ ...prefs, newJobAlerts: e.target.checked })}
            />
            New government job alerts
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={prefs.admissionAlerts}
              onChange={(e) => savePrefs({ ...prefs, admissionAlerts: e.target.checked })}
            />
            Admission and entrance-examination alerts
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={prefs.minorityAlerts}
              onChange={(e) => savePrefs({ ...prefs, minorityAlerts: e.target.checked })}
            />
            Muslim/minority opportunity alerts
          </label>
          <p className="text-xs text-slate-500">
            Deadline reminders (30, 7 and 1 day before closing) and unsubscribe controls apply once email/SMS
            delivery is connected to a backend — this demo only stores your preference locally.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Upcoming deadlines for your saved opportunities</h2>
        {upcomingDeadlines.length === 0 ? (
          <p className="text-sm text-slate-500">You haven&apos;t saved any opportunities yet.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingDeadlines.map((o) => {
              const days = daysUntil(o.closing_date);
              return (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm"
                >
                  <Link href={`/opportunity/${o.id}`} className="font-medium hover:underline">
                    {o.title}
                  </Link>
                  <span className={days < 0 ? "text-slate-400" : days <= 7 ? "font-semibold text-red-600" : "text-slate-500"}>
                    {days < 0 ? "Closed" : days === 0 ? "Closes today" : `${days} day${days === 1 ? "" : "s"} left`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Saved opportunities & application status</h2>
          {saved.length > 0 && (
            <button
              type="button"
              onClick={downloadChecklist}
              className="rounded-md bg-[var(--color-teal)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Download personal checklist
            </button>
          )}
        </div>
        {saved.length === 0 ? (
          <p className="text-sm text-slate-500">
            Save opportunities from any listing or detail page — they&apos;ll show up here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {saved.map((o) => (
              <div key={o.id} className="flex flex-col gap-2">
                <OpportunityCard opportunity={o} />
                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor={`status-${o.id}`} className="font-medium">
                    My status:
                  </label>
                  <select
                    id={`status-${o.id}`}
                    value={statusMap[o.id] ?? "not_started"}
                    onChange={(e) => setStatus(o.id, e.target.value as AppStatus)}
                    className="rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSavedIds(toggleSaved(o.id))}
                    className="ml-auto text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-border)] p-5 text-sm">
        <h2 className="mb-2 text-lg font-bold">Privacy controls</h2>
        <p className="mb-3 text-slate-600 dark:text-slate-300">
          EduRozgar India does not ask for your religion or other sensitive personal information on this dashboard.
          You can clear all locally stored dashboard data at any time.
        </p>
        <button type="button" onClick={deleteAccount} className="rounded-md border border-red-400 px-3 py-2 text-red-600 hover:bg-red-50">
          Delete my dashboard data from this browser
        </button>
      </section>
    </div>
  );
}
