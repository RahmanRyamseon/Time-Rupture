import type { Locale } from "@/lib/types";
import { StaticPageView, staticMeta } from "@/components/StaticPageView";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return staticMeta("about", (await params).locale); }
export default async function Page({ params }: Params) { return <StaticPageView k="about" locale={(await params).locale} />; }
