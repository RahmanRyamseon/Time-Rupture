"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-navy-dark)] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold">{t("siteName")}</p>
          <p className="mt-2 text-sm opacity-80">{t("tagline")}</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--color-gold)]">Explore</p>
          <ul className="mt-2 space-y-1 text-sm opacity-90">
            <li><Link href="/search">Search Opportunities</Link></li>
            <li><Link href="/scholarships">Scholarships</Link></li>
            <li><Link href="/jobs">Government Jobs</Link></li>
            <li><Link href="/admissions">College Admissions</Link></li>
            <li><Link href="/minority-opportunities">Muslim & Minority Opportunities</Link></li>
            <li><Link href="/states">State-wise Opportunities</Link></li>
            <li><Link href="/calendar">Important Dates Calendar</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-[var(--color-gold)]">Guidance</p>
          <ul className="mt-2 space-y-1 text-sm opacity-90">
            <li><Link href="/articles">Articles & Guidance</Link></li>
            <li><Link href="/dashboard">My Dashboard</Link></li>
            <li><Link href="/admin">Admin Panel</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-[var(--color-gold)]">Legal</p>
          <ul className="mt-2 space-y-1 text-sm opacity-90">
            <li><Link href="/disclaimer">Reservation & Eligibility Disclaimer</Link></li>
            <li><Link href="/about">About EduRozgar India</Link></li>
            <li><Link href="/privacy">Privacy & Data Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs opacity-70">
        {t("footerRights")} EduRozgar India is not affiliated with the Government of India or any state government.
      </div>
    </footer>
  );
}
