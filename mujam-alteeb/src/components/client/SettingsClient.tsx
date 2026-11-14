"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/types";
import { NUMERALS_KEY } from "./NumeralsApplier";

export function SettingsClient({ locale }: { locale: Locale }) {
  const t = useTranslations("settings");
  const [num, setNum] = useState("western");
  const [msg, setMsg] = useState("");
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    setNum(localStorage.getItem(NUMERALS_KEY) ?? "western");
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);
  function save(v: string) {
    localStorage.setItem(NUMERALS_KEY, v);
    setNum(v);
    setMsg(t("saved"));
    window.location.reload();
  }
  return (
    <div className="max-w-xl space-y-8">
      <fieldset className="card space-y-3 p-6">
        <legend className="px-2 text-xl text-gold-300">{t("numerals")}</legend>
        {["western", "eastern"].map((v) => (
          <label key={v} className="flex min-h-11 items-center gap-3">
            <input type="radio" name="numerals" value={v} checked={num === v} onChange={() => save(v)} className="h-5 w-5 accent-[#c9a45c]" />
            <span data-latin-digits>{t(v as "western" | "eastern")}</span>
          </label>
        ))}
        {locale === "en" && <p className="text-sm text-sand-400">Eastern Arabic digits apply to the Arabic interface.</p>}
        {msg && <p role="status" className="text-sm text-gold-300">{msg}</p>}
      </fieldset>
      {!standalone && (
        <section className="card space-y-2 p-6">
          <h2 className="text-xl">{t("install")}</h2>
          <p className="text-sand-300">{t("installText")}</p>
          <p className="text-sm text-sand-400">{t("iosHint")}</p>
        </section>
      )}
    </div>
  );
}
