import type { Locale } from "@/lib/types";
import { EditPage, editMeta, entityStaticParams } from "@/components/EntityEditPages";

type Params = { params: Promise<{ locale: Locale; slug: string }> };
export function generateStaticParams() { return entityStaticParams("origin"); }
export async function generateMetadata({ params }: Params) { const p = await params; return editMeta("origin", "edit", p.locale, p.slug); }
export default async function Page({ params }: Params) { const p = await params; return <EditPage type="origin" locale={p.locale} slug={p.slug} />; }
