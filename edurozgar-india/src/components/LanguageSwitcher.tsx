"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { LOCALES } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  return (
    <label className="flex items-center gap-1 text-xs text-white">
      <span className="sr-only">Choose language</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        className="rounded border border-white/30 bg-transparent px-2 py-1 text-white [color-scheme:dark]"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} className="text-black">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
