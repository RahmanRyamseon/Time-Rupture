"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { COMPARE_KEY, readJSON, writeJSON } from "@/lib/local-store";

/** Keeps the URL (?p=) and the saved compare list in sync; restores the saved list on a bare visit. */
export function CompareSync({ ids, clearLabel }: { ids: string[]; clearLabel: string }) {
  const router = useRouter();
  useEffect(() => {
    if (ids.length) { writeJSON(COMPARE_KEY, ids); return; }
    const saved = readJSON<string[]>(COMPARE_KEY, []);
    if (saved.length) router.replace(`${window.location.pathname}?p=${saved.join(",")}`);
  }, [ids, router]);
  if (!ids.length) return null;
  return <button type="button" className="btn btn-ghost mb-4 text-sm" onClick={() => { writeJSON(COMPARE_KEY, []); router.replace(window.location.pathname); }}>{clearLabel}</button>;
}
