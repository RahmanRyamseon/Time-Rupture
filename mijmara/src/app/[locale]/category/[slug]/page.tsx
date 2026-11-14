import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent } from "@/lib/content";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductsBrowser } from "@/components/ProductsBrowser";

type Props = { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

const INTRO: Record<string, { ar: string; en: string }> = {
  "dehn-al-oud": { ar: "دهن العود: الزيت المقطّر من خشب العود، يُباع تقليدياً بالتولة.", en: "Dehn al oud: oil distilled from agarwood, traditionally sold by the tola." },
  mukhallat: { ar: "المخلّطات: أدهان ممزوجة يتصدّرها الورد والعود غالباً.", en: "Mukhallat: blended perfume oils, typically led by rose and oud." },
  "musk-oil": { ar: "أدهان عطرية يغلب عليها المسك.", en: "Perfume oils led by musk." },
  "rose-oil": { ar: "دهن الورد، ومنه الورد الطائفي.", en: "Rose oils, including Taif rose." },
  bakhoor: { ar: "البخور: رقائق العود المنقوعة في الأدهان والراتنجات والبهارات.", en: "Bakhoor: oud chips soaked in oils, resins and spices." },
  "oud-wood": { ar: "خشب العود الطبيعي الذي يُحرق على الجمر.", en: "Natural agarwood burned on charcoal." },
  "perfume-oil-other": { ar: "أدهان عطرية مركّزة لا تندرج تحت التصنيفات الأخرى.", en: "Concentrated perfume oils outside the other categories." },
};

export async function generateStaticParams() {
  const c = await getContent();
  return (c.taxonomy.category ?? []).flatMap((cat) => [{ locale: "ar", slug: cat.id }, { locale: "en", slug: cat.id }]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const cat = (await getContent()).taxonomy.category?.find((x) => x.id === slug);
  if (!cat) return {};
  return pageMeta({ locale, title: cat.name[locale], description: INTRO[slug]?.[locale] ?? cat.name[locale], paths: { ar: href("ar", "/category/[slug]", { slug }), en: href("en", "/category/[slug]", { slug }) } });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const c = await getContent();
  const cat = c.taxonomy.category?.find((x) => x.id === slug);
  if (!cat) notFound();
  const n = await getTranslations({ locale, namespace: "nav" });
  return (
    <>
      <Breadcrumbs label={n("primary")} items={[{ label: n("home"), href: href(locale, "/") }, { label: n("products"), href: href(locale, "/products") }, { label: cat.name[locale] }]} />
      <PageHeader title={cat.name[locale]} intro={INTRO[slug]?.[locale]} />
      <ProductsBrowser c={c} locale={locale} lockCategory action={href(locale, "/category/[slug]", { slug })} filters={{ category: slug, origin: sp.origin, house: sp.house, occasion: sp.occasion, season: sp.season, strength: sp.strength }} />
    </>
  );
}
