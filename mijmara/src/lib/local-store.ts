"use client";
/** Small typed localStorage helpers with a change event so components stay in sync. */
const EVT = "mijmara:store";

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; }
}
export function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(EVT, { detail: key }));
}
export function onStoreChange(cb: () => void): () => void {
  const h = () => cb();
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h);
  return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
}

export const COMPARE_KEY = "mijmara:compare";
export const COLLECTION_KEY = "mijmara:collection";
export type Shelf = "owned" | "tried" | "wishlist";
export type CollectionItem = { id: string; shelf: Shelf; added: string };
