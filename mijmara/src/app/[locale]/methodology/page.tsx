import type { Locale } from "@/lib/types";
import { StaticPageView, staticMeta } from "@/components/StaticPageView";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return staticMeta("methodology", (await params).locale); }
export default async function Page({ params }: Params) { return <StaticPageView k="methodology" locale={(await params).locale} />; }
