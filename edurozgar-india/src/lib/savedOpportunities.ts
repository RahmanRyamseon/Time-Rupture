const STORAGE_KEY = "edurozgar-saved-opportunities";

export function getSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isSaved(id: string): boolean {
  return getSavedIds().includes(id);
}

export function toggleSaved(id: string): string[] {
  const current = getSavedIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
  return next;
}
