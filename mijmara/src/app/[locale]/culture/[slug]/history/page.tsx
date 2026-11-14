import type { Locale } from "@/lib/types";
import { HistoryPage, editMeta, entityStaticParams } from "@/components/EntityEditPages";

type Params = { params: Promise<{ locale: Locale; slug: string }> };
export function generateStaticParams() { return entityStaticParams("culture"); }
export async function generateMetadata({ params }: Params) { const p = await params; return editMeta("culture", "history", p.locale, p.slug); }
export default async function Page({ params }: Params) { const p = await params; return <HistoryPage type="culture" locale={p.locale} slug={p.slug} />; }
