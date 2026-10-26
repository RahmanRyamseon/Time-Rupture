"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { getConsentSnapshot, getServerConsentSnapshot, subscribeConsent } from "@/lib/consentStore";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

// No AdSense account is configured yet (ADSENSE_CLIENT_ID unset), so this
// currently renders nothing regardless of consent. Once a real publisher ID
// is set as an env var, this loads it — but only for a visitor who has
// already consented to advertising cookies via the cookie banner.
export function AdSenseScript() {
  const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);

  if (!ADSENSE_CLIENT_ID || !consent.advertising) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
