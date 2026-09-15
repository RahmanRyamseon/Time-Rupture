"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";

export default function DisclaimerBanner() {
  const { t } = useLanguage();
  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      <span>{t("disclaimerShort")}</span>{" "}
      <Link href="/disclaimer" className="font-semibold underline underline-offset-2">
        Read full disclaimer
      </Link>
    </div>
  );
}
