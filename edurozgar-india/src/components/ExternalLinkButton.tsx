"use client";

import { useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { incrementClickCount } from "@/lib/adminStore";

interface Props {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  trackId?: string;
}

export default function ExternalLinkButton({ href, label, variant = "primary", trackId }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { t } = useLanguage();

  const classes =
    variant === "primary"
      ? "bg-[var(--color-teal)] hover:bg-[var(--color-teal-dark)] text-white"
      : "border border-[var(--color-navy)] text-[var(--color-navy)] dark:text-white dark:border-white hover:bg-black/5";

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm ${classes}`}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-0 text-[var(--foreground)] backdrop:bg-black/50"
      >
        <div className="p-5">
          <h2 className="mb-2 text-base font-bold">Leaving EduRozgar India</h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{t("redirectWarning")}</p>
          <p className="mb-4 break-all rounded bg-black/5 px-2 py-1 text-xs font-mono dark:bg-white/10">{href}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (trackId) incrementClickCount(trackId);
                dialogRef.current?.close();
              }}
              className="rounded-md bg-[var(--color-teal)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-teal-dark)]"
            >
              Continue to official site
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
