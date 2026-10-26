"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const QUICK_FILTERS: { label: string; href: string }[] = [
  { label: "Scholarships", href: "/scholarships" },
  { label: "Government jobs", href: "/jobs" },
  { label: "College admissions", href: "/admissions" },
  { label: "Fellowships", href: "/scholarships?type=fellowship" },
  { label: "Skill-development programmes", href: "/scholarships?type=skill_development" },
  { label: "Minority opportunities", href: "/minority-opportunities" },
  { label: "Muslim-focused opportunities", href: "/minority-opportunities?muslim=1" },
  { label: "Women", href: "/scholarships?women=1" },
  { label: "Persons with disabilities", href: "/scholarships?disability=1" },
  { label: "Economically weaker applicants", href: "/scholarships?ews=1" },
];

export default function HomeSearchBar() {
  const router = useRouter();
  const { t } = useLanguage();
  const [q, setQ] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="home-search" className="sr-only">
          {t("searchPlaceholder")}
        </label>
        <input
          id="home-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-lg border border-white/30 bg-white/95 px-4 py-3 text-base text-slate-900 shadow-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-gold)] px-6 py-3 font-semibold text-[var(--color-navy-dark)] shadow-sm hover:brightness-95"
        >
          {t("ctaSearch")}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK_FILTERS.map((f) => (
          <a
            key={f.label}
            href={f.href}
            className="rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-white/20"
          >
            {f.label}
          </a>
        ))}
      </div>
    </div>
  );
}
