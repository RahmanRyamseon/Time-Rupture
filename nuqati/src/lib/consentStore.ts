/**
 * Minimal external store for cookie consent, read via useSyncExternalStore so
 * Analytics/AdSenseScript/CookieConsent all react to the same state (including
 * cross-tab updates) without manually mirroring it into local component state.
 *
 * Nothing in Nuqati loads analytics or ad scripts today — NEXT_PUBLIC_GA_MEASUREMENT_ID
 * and NEXT_PUBLIC_ADSENSE_CLIENT_ID are both unset, so Analytics.tsx/AdSenseScript.tsx
 * are no-ops regardless of what's recorded here. This exists so that the moment either
 * is configured, consent is already being asked for — never granted implicitly.
 */
export type Consent = {
  analytics: boolean;
  advertising: boolean;
  decided: boolean;
  timestamp: string;
};

const STORAGE_KEY = "nuqati.consent.v1";
export const CONSENT_UPDATED_EVENT = "nuqati:consent-updated";
export const OPEN_SETTINGS_EVENT = "nuqati:open-cookie-settings";

const DEFAULT_CONSENT: Consent = { analytics: false, advertising: false, decided: false, timestamp: "" };

let cached: Consent = DEFAULT_CONSENT;
let initialized = false;

function readFromStorage(): Consent {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONSENT, ...(JSON.parse(raw) as Partial<Consent>) } : DEFAULT_CONSENT;
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function getConsentSnapshot(): Consent {
  if (!initialized) {
    cached = readFromStorage();
    initialized = true;
  }
  return cached;
}

export function getServerConsentSnapshot(): Consent {
  return DEFAULT_CONSENT;
}

export function subscribeConsent(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cached = readFromStorage();
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CONSENT_UPDATED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CONSENT_UPDATED_EVENT, callback);
  };
}

export function writeConsent(consent: Pick<Consent, "analytics" | "advertising">) {
  const next: Consent = { ...consent, decided: true, timestamp: new Date().toISOString() };
  cached = next;
  initialized = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing, blocked storage) — the banner
    // will just reappear next visit, which is an acceptable fallback.
  }
  window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
}

export function respectsGPC(): boolean {
  const nav = window.navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true;
}
