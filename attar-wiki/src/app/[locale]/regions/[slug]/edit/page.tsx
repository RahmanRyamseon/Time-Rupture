import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { EditPage } from "@/components/edit/EditPage";

export const metadata: Metadata = { title: "Suggest an edit", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return <EditPage section="regions" slug={slug} />;
}
