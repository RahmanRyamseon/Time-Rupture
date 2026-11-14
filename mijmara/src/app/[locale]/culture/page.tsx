import type { Locale } from "@/lib/types";
import { ArticleList, articleListMeta } from "@/components/ArticleViews";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return articleListMeta("culture", (await params).locale); }
export default async function Page({ params }: Params) { return <ArticleList kind="culture" locale={(await params).locale} />; }
