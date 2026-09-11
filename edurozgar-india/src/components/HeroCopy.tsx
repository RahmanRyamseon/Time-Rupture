"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

export default function HeroCopy() {
  const { t } = useLanguage();
  return (
    <>
      <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">{t("heroHeading")}</h1>
      <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">{t("heroSub")}</p>
    </>
  );
}

export function HeroCtas() {
  const { t } = useLanguage();
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
      <Link href="/scholarships" className="rounded-lg bg-white/10 px-4 py-2 font-medium hover:bg-white/20">
        {t("ctaScholarships")}
      </Link>
      <Link href="/jobs" className="rounded-lg bg-white/10 px-4 py-2 font-medium hover:bg-white/20">
        {t("ctaJobs")}
      </Link>
      <Link href="/minority-opportunities" className="rounded-lg bg-white/10 px-4 py-2 font-medium hover:bg-white/20">
        {t("ctaMinority")}
      </Link>
      <Link href="/calendar" className="rounded-lg bg-white/10 px-4 py-2 font-medium hover:bg-white/20">
        {t("ctaClosing")}
      </Link>
    </div>
  );
}
