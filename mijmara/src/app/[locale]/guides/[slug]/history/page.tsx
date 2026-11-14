import type { Locale } from "@/lib/types";
import { HistoryPage, editMeta, entityStaticParams } from "@/components/EntityEditPages";

type Params = { params: Promise<{ locale: Locale; slug: string }> };
export function generateStaticParams() { return entityStaticParams("guide"); }
export async function generateMetadata({ params }: Params) { const p = await params; return editMeta("guide", "history", p.locale, p.slug); }
export default async function Page({ params }: Params) { const p = await params; return <HistoryPage type="guide" locale={p.locale} slug={p.slug} />; }
