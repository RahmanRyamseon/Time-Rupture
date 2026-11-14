import type { Locale } from "@/lib/types";
import { StaticPageView, staticMeta } from "@/components/StaticPageView";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return staticMeta("terms", (await params).locale); }
export default async function Page({ params }: Params) { return <StaticPageView k="terms" locale={(await params).locale} />; }
