import type { Locale } from "@/lib/types";
import { HistoryPage, editMeta, entityStaticParams } from "@/components/EntityEditPages";

type Params = { params: Promise<{ locale: Locale; slug: string }> };
export function generateStaticParams() { return entityStaticParams("house"); }
export async function generateMetadata({ params }: Params) { const p = await params; return editMeta("house", "history", p.locale, p.slug); }
export default async function Page({ params }: Params) { const p = await params; return <HistoryPage type="house" locale={p.locale} slug={p.slug} />; }
