"use client";

/**
 * Lightweight, browser-local persistence for the admin panel demo.
 * Nothing here talks to a server — a production deployment would replace
 * this with real database-backed API routes (see README for the plan).
 */

export interface SubmissionRecord {
  id: string;
  type: "suggestion" | "report";
  opportunityId?: string;
  opportunityTitle?: string;
  data: Record<string, string>;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
}

const SUBMISSIONS_KEY = "edurozgar-submissions";
const AUDIT_KEY = "edurozgar-audit-log";
const CLICKS_KEY = "edurozgar-click-counts";
const VERIFICATION_OVERRIDES_KEY = "edurozgar-verification-overrides";
const ARCHIVED_KEY = "edurozgar-archived-ids";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

export function getSubmissions(): SubmissionRecord[] {
  return read<SubmissionRecord[]>(SUBMISSIONS_KEY, []);
}

export function addSubmission(record: Omit<SubmissionRecord, "id" | "submittedAt" | "status">) {
  const list = getSubmissions();
  const entry: SubmissionRecord = {
    ...record,
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  write(SUBMISSIONS_KEY, [entry, ...list]);
  return entry;
}

export function updateSubmissionStatus(id: string, status: SubmissionRecord["status"]) {
  const list = getSubmissions().map((s) => (s.id === id ? { ...s, status } : s));
  write(SUBMISSIONS_KEY, list);
}

export function getAuditLog(): AuditLogEntry[] {
  return read<AuditLogEntry[]>(AUDIT_KEY, []);
}

export function logAudit(action: string, actor = "Admin (this browser)") {
  const entry: AuditLogEntry = { id: `log-${Date.now()}`, action, actor, timestamp: new Date().toISOString() };
  write(AUDIT_KEY, [entry, ...getAuditLog()].slice(0, 200));
}

export function getClickCounts(): Record<string, number> {
  return read<Record<string, number>>(CLICKS_KEY, {});
}

export function incrementClickCount(id: string) {
  const counts = getClickCounts();
  counts[id] = (counts[id] ?? 0) + 1;
  write(CLICKS_KEY, counts);
}

export function getVerificationOverrides(): Record<string, string> {
  return read<Record<string, string>>(VERIFICATION_OVERRIDES_KEY, {});
}

export function markVerifiedToday(id: string) {
  const overrides = getVerificationOverrides();
  overrides[id] = new Date().toISOString().slice(0, 10);
  write(VERIFICATION_OVERRIDES_KEY, overrides);
  logAudit(`Marked "${id}" as re-verified today`);
}

export function getArchivedIds(): string[] {
  return read<string[]>(ARCHIVED_KEY, []);
}

export function toggleArchived(id: string) {
  const list = getArchivedIds();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  write(ARCHIVED_KEY, next);
  logAudit(`${list.includes(id) ? "Unarchived" : "Archived"} "${id}"`);
  return next;
}
