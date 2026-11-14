import type { Locale } from "@/lib/types";
import { StaticPageView, staticMeta } from "@/components/StaticPageView";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return staticMeta("citation-policy", (await params).locale); }
export default async function Page({ params }: Params) { return <StaticPageView k="citation-policy" locale={(await params).locale} />; }
