"use client";
// Tiny localStorage-backed stores with cross-tab sync, used for Compare and the
// offline-capable Shelf. useSyncExternalStore keeps React in sync.
import { useSyncExternalStore } from "react";

type Listener = () => void;

export function createLocalStore<T>(key: string, fallback: T) {
  const listeners = new Set<Listener>();
  let cache: T | undefined;
  let cacheRaw: string | null | undefined;

  function read(): T {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === cacheRaw && cache !== undefined) return cache;
    cacheRaw = raw;
    try {
      cache = raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  }

  function write(next: T) {
    window.localStorage.setItem(key, JSON.stringify(next));
    listeners.forEach((l) => l());
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => e.key === key && listener();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useStore(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { read, write, subscribe, useStore };
}

export interface CompareItem {
  slug: string;
  name: string;
}

export const compareStore = createLocalStore<CompareItem[]>("compare-v1", []);
export const MAX_COMPARE = 4;
