"use client";

import { useEffect, useState } from "react";
import { isSaved, toggleSaved } from "@/lib/savedOpportunities";

export default function SaveOpportunityButton({ id }: { id: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Hydration from browser-only storage: must run after mount since it's unavailable during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(isSaved(id));
  }, [id]);

  return (
    <button
      type="button"
      onClick={() => setSaved(toggleSaved(id).includes(id))}
      aria-pressed={saved}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold ${
        saved
          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
          : "border-[var(--color-border)] hover:bg-black/5"
      }`}
    >
      {saved ? "★ Saved to dashboard" : "☆ Save opportunity"}
    </button>
  );
}
