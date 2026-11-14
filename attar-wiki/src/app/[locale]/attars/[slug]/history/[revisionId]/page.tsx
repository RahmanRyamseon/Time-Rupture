import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { RevisionDiffView } from "@/components/wiki/RevisionDiffView";

export const metadata: Metadata = { title: "Revision", robots: { index: false, follow: true } };

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string; revisionId: string }> }) {
  const { locale, slug, revisionId } = await params;
  setRequestLocale(locale);
  return <RevisionDiffView section="attars" slug={slug} revisionId={Number(revisionId)} />;
}
