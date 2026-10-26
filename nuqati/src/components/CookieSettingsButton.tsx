"use client";

import { OPEN_SETTINGS_EVENT } from "@/lib/consentStore";

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
      className={className ?? "underline hover:text-foreground"}
    >
      Cookie settings
    </button>
  );
}
