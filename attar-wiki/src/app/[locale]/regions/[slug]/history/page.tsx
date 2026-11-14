import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { HistoryView } from "@/components/wiki/HistoryView";

export const metadata: Metadata = { title: "History", robots: { index: false, follow: true } };

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <HistoryView section="regions" slug={slug} />;
}
