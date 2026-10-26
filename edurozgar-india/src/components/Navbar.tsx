"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import AccessibilityControls from "./AccessibilityControls";

export default function Navbar() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("navHome") },
    { href: "/scholarships", label: t("navScholarships") },
    { href: "/jobs", label: t("navJobs") },
    { href: "/admissions", label: t("navAdmissions") },
    { href: "/minority-opportunities", label: t("navMinority") },
    { href: "/states", label: t("navStates") },
    { href: "/calendar", label: t("navCalendar") },
    { href: "/articles", label: t("navArticles") },
    { href: "/dashboard", label: t("navDashboard") },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-navy)] text-white shadow">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded bg-[var(--color-teal)] text-sm font-bold text-white"
          >
            ER
          </span>
          {t("siteName")}
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-4 text-sm lg:flex" aria-label="Main navigation">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap opacity-90 hover:opacity-100 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <AccessibilityControls />
          <LanguageSwitcher />
          <Link
            href="/admin"
            className="rounded border border-white/30 px-3 py-1 text-xs hover:bg-white/10"
          >
            {t("navAdmin")}
          </Link>
        </div>

        <button
          type="button"
          className="rounded border border-white/30 px-3 py-1 text-sm lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-white/10 px-4 pb-4 lg:hidden">
          <nav className="flex flex-col gap-2 pt-2 text-sm" aria-label="Mobile navigation">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="py-1 opacity-90 hover:opacity-100" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link href="/admin" className="py-1 opacity-90 hover:opacity-100" onClick={() => setOpen(false)}>
              {t("navAdmin")}
            </Link>
          </nav>
          <div className="mt-3 flex items-center gap-3">
            <AccessibilityControls />
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
