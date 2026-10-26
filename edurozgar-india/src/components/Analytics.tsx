"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { getConsentSnapshot, getServerConsentSnapshot, subscribeConsent } from "@/lib/consentStore";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// No analytics property is configured yet (GA_ID unset), so this currently
// renders nothing regardless of consent. It exists so the consent-gating
// mechanism is real and tested, not just described in the Cookie Policy.
export function Analytics() {
  const consent = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot);

  if (!GA_ID || !consent.analytics) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
