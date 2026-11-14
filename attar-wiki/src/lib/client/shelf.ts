"use client";
import { createLocalStore } from "./store";
import type { ShelfStatus } from "@/lib/types";

export interface ShelfEntry {
  attarId: string;
  slug: string;
  name: string;
  status: ShelfStatus;
  updatedAt: string;
}

export interface ShelfOp {
  attarId: string;
  status: ShelfStatus | null; // null = remove
  at: string;
}

export const shelfStore = createLocalStore<Record<string, ShelfEntry>>("shelf-v1", {});
export const shelfQueue = createLocalStore<ShelfOp[]>("shelf-queue-v1", []);

export function setShelf(entry: Omit<ShelfEntry, "updatedAt">, status: ShelfStatus | null) {
  const now = new Date().toISOString();
  const current = { ...shelfStore.read() };
  if (status) current[entry.attarId] = { ...entry, status, updatedAt: now };
  else delete current[entry.attarId];
  shelfStore.write(current);
  // keep only the latest op per attar
  const queue = shelfQueue.read().filter((op) => op.attarId !== entry.attarId);
  shelfQueue.write([...queue, { attarId: entry.attarId, status, at: now }]);
  void syncShelf();
}

let syncing = false;

/** Push queued ops, then replace local state with the server's copy. */
export async function syncShelf(): Promise<"synced" | "offline" | "signed-out" | "error"> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  if (syncing) return "synced";
  syncing = true;
  try {
    const ops = shelfQueue.read();
    const res = await fetch("/api/v1/shelf/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops }),
    });
    if (res.status === 401) return "signed-out";
    if (!res.ok) return "error";
    const body = (await res.json()) as { items: ShelfEntry[] };
    // Ops queued while the request was in flight stay queued.
    const sent = new Set(ops.map((o) => `${o.attarId}|${o.at}`));
    const remaining = shelfQueue.read().filter((o) => !sent.has(`${o.attarId}|${o.at}`));
    shelfQueue.write(remaining);
    const next: Record<string, ShelfEntry> = {};
    body.items.forEach((i) => (next[i.attarId] = i));
    const local = shelfStore.read();
    remaining.forEach((op) => {
      if (op.status && local[op.attarId]) next[op.attarId] = local[op.attarId];
      else delete next[op.attarId];
    });
    shelfStore.write(next);
    return "synced";
  } catch {
    return "offline";
  } finally {
    syncing = false;
  }
}
