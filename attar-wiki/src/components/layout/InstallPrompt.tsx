"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SITE_NAME } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "install-dismissed-at";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const t = useTranslations("pwa");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const dismissed = Number(localStorage.getItem(KEY) || 0);
    if (standalone || Date.now() - dismissed < SNOOZE_MS) return;

    // Ask only after the reader has engaged a little (2nd page view or later).
    const views = Number(sessionStorage.getItem("pv") || 0) + 1;
    sessionStorage.setItem("pv", String(views));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (views >= 2) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos && views >= 2) {
      setIos(true);
      setShow(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className="card fixed inset-x-3 bottom-20 z-50 flex items-start gap-3 bg-white p-4 md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
    >
      <Icon name="download" className="mt-0.5 h-6 w-6 shrink-0 text-amber" />
      <div className="flex-1">
        <p id="install-title" className="font-semibold text-bark">
          {t("install")}
        </p>
        <p className="mt-1 text-sm text-muted">{ios ? t("iosHelp") : t("installHelp", { name: SITE_NAME })}</p>
        <div className="mt-3 flex gap-2">
          {!ios && deferred ? (
            <button
              type="button"
              className="btn-primary min-h-10 px-4"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                setDeferred(null);
                dismiss();
              }}
            >
              {t("install")}
            </button>
          ) : null}
          <button type="button" className="btn-ghost min-h-10 px-4" onClick={dismiss}>
            {t("dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
