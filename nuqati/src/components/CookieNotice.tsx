"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const DISMISSED_KEY = "nuqati.cookie-notice-dismissed.v1";

const emptySubscribe = () => () => {};

/** Hydration-safe read of dismissal state — mirrors the pattern in lib/store.tsx. */
function useDismissed() {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      try {
        return window.localStorage.getItem(DISMISSED_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => true, // server snapshot: don't flash the notice before hydration settles
  );
}

/**
 * Nuqati sets zero cookies and has no analytics or ad trackers today, so there is nothing
 * non-essential to ask consent for — a full accept/reject/customize banner would be consent
 * theater for tracking that doesn't exist. This is a one-time, honest notice instead: it tells
 * people their data stays in their own browser, links the Cookie Policy for detail, and gets out
 * of the way. If Nuqati ever adds analytics or ad cookies, this is the component to replace with
 * a real consent manager that gates those scripts until accepted.
 */
export function CookieNotice() {
  const persistedDismissed = useDismissed();
  const [justDismissed, setJustDismissed] = useState(false);

  function dismiss() {
    setJustDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // localStorage unavailable — notice just won't persist its dismissal, which is fine
    }
  }

  if (persistedDismissed || justDismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-xs text-foreground/70 sm:flex-row">
        <p>
          Nuqati sets no cookies and uses no trackers. Your wallet and settings are stored only in your
          browser&apos;s local storage, on this device — see the{" "}
          <Link href="/cookies" className="font-medium text-brand-strong underline">
            Cookie Policy
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-brand px-4 py-1.5 font-semibold text-white hover:bg-brand-strong"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
