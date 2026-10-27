"use client";

import { useEffect } from "react";
import Script from "next/script";

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Renders nothing unless NEXT_PUBLIC_ADSENSE_CLIENT_ID is set — this whole
 * component is inert scaffolding until an AdSense publisher ID exists.
 * `slot` is the AdSense ad-unit ID (create ad units in the AdSense console
 * once the account is approved).
 */
export default function AdSlot({ slot }: { slot: string }) {
  useEffect(() => {
    if (!ADSENSE_CLIENT_ID) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not loaded yet / blocked by an ad blocker — harmless.
    }
  }, []);

  if (!ADSENSE_CLIENT_ID) return null;

  return (
    <>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}
