import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { EditPage } from "@/components/edit/EditPage";
import { isSection } from "@/lib/sections";

export const metadata: Metadata = { title: "Propose a new page", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ locale: string; section: string }> }) {
  const { locale, section } = await params;
  setRequestLocale(locale);
  if (!isSection(section)) notFound();
  return <EditPage section={section} />;
}
