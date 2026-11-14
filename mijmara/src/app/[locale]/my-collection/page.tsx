import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent, taxName } from "@/lib/content";
import { href } from "@/lib/paths";
import { simpleMeta } from "@/lib/simple-page";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { CollectionClient } from "@/components/client/CollectionClient";

type Params = { params: Promise<{ locale: Locale }> };
export async function generateMetadata({ params }: Params) { return simpleMeta((await params).locale, "/my-collection", "collection"); }

export default async function Page({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "collection" });
  const products = Object.fromEntries(c.products.map((p) => [p.id, { name: p.name[locale], meta: `${c.houses.find((h) => h.id === p.houseId)?.name[locale]} · ${taxName(c, "category", p.category, locale)}`, href: href(locale, "/products/[slug]", { slug: p.slug[locale] }) }]));
  return (<><PageHeader title={t("title")} intro={t("intro")} /><CollectionClient products={products} /></>);
}
