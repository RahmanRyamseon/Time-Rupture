"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getConsentSnapshot,
  getServerConsentSnapshot,
  subscribeConsent,
  writeConsent,
  respectsGPC,
  OPEN_SETTINGS_EVENT,
} from "@/lib/consentStore";

export function CookieConsent() {
  const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);
  const [forceOpen, setForceOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(false);
  const [advertisingChoice, setAdvertisingChoice] = useState(false);

  // Respect a Global Privacy Control signal as an automatic opt-out instead
  // of showing the banner. This writes to the external consent store (not
  // local component state), so it's a legitimate side effect to run once.
  useEffect(() => {
    if (!consent.decided && respectsGPC()) {
      writeConsent({ analytics: false, advertising: false });
    }
  }, [consent.decided]);

  useEffect(() => {
    const openSettings = () => {
      setAnalyticsChoice(consent.analytics);
      setAdvertisingChoice(consent.advertising);
      setCustomizing(true);
      setForceOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings);
  }, [consent.analytics, consent.advertising]);

  const visible = forceOpen || !consent.decided;
  if (!visible) return null;

  const close = () => {
    setForceOpen(false);
    setCustomizing(false);
  };

  const acceptAll = () => {
    writeConsent({ analytics: true, advertising: true });
    close();
  };

  const rejectNonEssential = () => {
    writeConsent({ analytics: false, advertising: false });
    close();
  };

  const openCustomize = () => {
    setAnalyticsChoice(consent.analytics);
    setAdvertisingChoice(consent.advertising);
    setCustomizing(true);
  };

  const savePreferences = () => {
    writeConsent({ analytics: analyticsChoice, advertising: advertisingChoice });
    close();
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)] p-4 text-[var(--foreground)] shadow-[0_-4px_16px_rgba(0,0,0,0.12)] sm:p-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {!customizing ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              EduRozgar India uses optional cookies for analytics and, if advertising is ever enabled, to show ads.
              These are off by default and only load if you accept them. See our{" "}
              <a href="/cookies" className="underline hover:text-[var(--color-teal)]">
                Cookie Policy
              </a>{" "}
              for details.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full bg-[var(--color-teal)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-teal-dark)]"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Reject non-essential
              </button>
              <button
                type="button"
                onClick={openCustomize}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 underline hover:text-[var(--foreground)] dark:text-slate-300"
              >
                Customize
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked disabled className="mt-1" />
                <span>
                  <span className="font-semibold">Strictly necessary</span> — remembers this preference itself, and
                  the local, in-browser data behind Saved Opportunities, Dashboard preferences and Report/Suggest
                  forms. Always on; cannot be disabled, and none of it is ever sent to our servers.
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={analyticsChoice}
                  onChange={(e) => setAnalyticsChoice(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold">Analytics</span> — not currently active (no analytics property is
                  configured yet), but if enabled, this would be Google Analytics, used to see which pages are
                  useful and improve content.
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={advertisingChoice}
                  onChange={(e) => setAdvertisingChoice(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold">Advertising</span> — not currently in use. Reserved in case
                  advertising is added later to help cover hosting costs. Off by default.
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={savePreferences}
                className="rounded-full bg-[var(--color-teal)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-teal-dark)]"
              >
                Save preferences
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Accept all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
