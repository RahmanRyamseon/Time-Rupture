/**
 * Minimal external store for cookie consent, read via useSyncExternalStore
 * so Analytics/AdSenseScript/CookieConsent all react to the same state
 * (including cross-tab updates) without manually mirroring it into local
 * component state inside effects.
 */
export type Consent = {
  analytics: boolean;
  advertising: boolean;
  decided: boolean;
  timestamp: string;
};

const STORAGE_KEY = "pfwiki-consent";
export const CONSENT_UPDATED_EVENT = "pfwiki:consent-updated";
export const OPEN_SETTINGS_EVENT = "pfwiki:open-cookie-settings";

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
    // localStorage unavailable (private browsing, blocked storage) — the
    // banner will just reappear next visit, which is an acceptable fallback.
  }
  window.dispatchEvent(new Event(CONSENT_UPDATED_EVENT));
}

export function respectsGPC(): boolean {
  const nav = window.navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true;
}
