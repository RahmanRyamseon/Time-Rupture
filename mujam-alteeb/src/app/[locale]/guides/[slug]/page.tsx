import type { Locale } from "@/lib/types";
import { ArticleDetail, articleMeta, articleStaticParams } from "@/components/ArticleViews";

type Params = { params: Promise<{ locale: Locale; slug: string }> };
export function generateStaticParams() { return articleStaticParams("guide"); }
export async function generateMetadata({ params }: Params) { const p = await params; return articleMeta("guide", p.locale, p.slug); }
export default async function Page({ params }: Params) { const p = await params; return <ArticleDetail kind="guide" locale={p.locale} slug={p.slug} />; }
