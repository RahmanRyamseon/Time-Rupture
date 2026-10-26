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

  // Respect a Global Privacy Control signal as an automatic opt-out instead of
  // showing the banner. This writes to the external consent store (not local
  // component state), so it's a legitimate side effect to run once.
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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur sm:p-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {!customizing ? (
          <>
            <p className="text-sm text-foreground/80">
              Nuqati stores your wallet and settings only in your browser&apos;s local storage —
              that part needs no consent. It also has optional, off-by-default cookies for site
              analytics and, once an ad network is enabled, advertising. Neither is active until
              you accept it. See the{" "}
              <a href="/cookies" className="underline hover:text-foreground">
                Cookie Policy
              </a>{" "}
              for details.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
              >
                Reject non-essential
              </button>
              <button
                type="button"
                onClick={openCustomize}
                className="rounded-full px-4 py-2 text-sm font-semibold text-foreground/70 underline hover:text-foreground"
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
                  <span className="font-semibold">Strictly necessary</span> — your wallet, swipe
                  log, and points balances, kept in local storage on this device. Always on;
                  cannot be disabled, because it&apos;s what makes Nuqati work.
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
                  <span className="font-semibold">Analytics</span> — Google Analytics, to see
                  which features are useful. Not currently configured; has no effect until it is.
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
                  <span className="font-semibold">Advertising</span> — Google AdSense, to show ads
                  that help keep Nuqati free. Not currently configured; has no effect until it is.
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={savePreferences}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                Save preferences
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted"
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
