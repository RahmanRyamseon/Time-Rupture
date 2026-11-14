"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS_KEY = "teeb:install-dismissed";

export function InstallPrompt() {
  const t = useTranslations("settings");
  const c = useTranslations("common");
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (localStorage.getItem(DISMISS_KEY)) return;
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (!evt) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label={t("install")} className="card fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-lg items-center gap-3 p-4 md:bottom-6">
      <p className="flex-1 text-sm">{t("installText")}</p>
      <button className="btn btn-gold" onClick={async () => { await evt.prompt(); setEvt(null); }}>{t("installButton")}</button>
      <button className="btn btn-ghost !px-3" aria-label={c("close")} onClick={() => { localStorage.setItem(DISMISS_KEY, "1"); setEvt(null); }}>×</button>
    </div>
  );
}
