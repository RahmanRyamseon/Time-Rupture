"use client";

import { useEffect, useState } from "react";

const SCALES = [1, 1.15, 1.3];
const STORAGE_KEY = "edurozgar-font-scale";

export default function AccessibilityControls() {
  const [scaleIndex, setScaleIndex] = useState(0);

  useEffect(() => {
    // Hydration from browser-only storage: must run after mount since it's unavailable during SSR.
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setScaleIndex(Number(stored));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(SCALES[scaleIndex]));
    try {
      window.localStorage.setItem(STORAGE_KEY, String(scaleIndex));
    } catch {
      // ignore
    }
  }, [scaleIndex]);

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Adjust text size">
      <button
        type="button"
        onClick={() => setScaleIndex((i) => Math.max(0, i - 1))}
        className="rounded border border-white/30 px-2 py-1 text-xs text-white hover:bg-white/10"
        aria-label="Decrease text size"
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => setScaleIndex((i) => Math.min(SCALES.length - 1, i + 1))}
        className="rounded border border-white/30 px-2 py-1 text-xs text-white hover:bg-white/10"
        aria-label="Increase text size"
      >
        A+
      </button>
    </div>
  );
}
