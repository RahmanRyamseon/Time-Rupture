import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent, taxName } from "@/lib/content";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/paths";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return { ...pageMeta({ locale, title: `${t("name")} — ${t("tagline")}`, description: t("description"), paths: { ar: "/", en: "/en" } }), title: { absolute: `${t("name")} — ${t("tagline")}` } };
}

export default async function Home({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "home" });
  const site = await getTranslations({ locale, namespace: "site" });
  const culture = c.articles.filter((a) => a.kind === "culture").slice(0, 3);
  const cats = c.taxonomy.category ?? [];
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: site("name"), url: SITE_URL + (locale === "ar" ? "/" : "/en"), inLanguage: locale, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}${encodeURI(href(locale, "/search"))}?q={q}`, "query-input": "required name=q" } }} />
      <section className="relative overflow-hidden rounded-3xl border border-oud-700 bg-gradient-to-b from-oud-800/80 to-ink px-6 py-14 sm:px-12 sm:py-20">
        <div className="max-w-3xl space-y-6">
          <p className="chip !text-gold-300">{site("tagline")}</p>
          <h1 className="text-4xl sm:text-6xl">{t("heroTitle")}</h1>
          <p className="text-lg text-sand-300 sm:text-xl">{t("heroText")}</p>
          <form action={href(locale, "/search")} role="search" className="flex max-w-xl gap-2">
            <label htmlFor="hq" className="sr-only">{t("searchPlaceholder")}</label>
            <input id="hq" name="q" type="search" placeholder={t("searchPlaceholder")} className="min-h-12 flex-1 text-base" />
            <button className="btn btn-gold min-h-12"><Icon name="search" />{t("searchButton")}</button>
          </form>
          <p className="text-sm text-sand-400">{t("stats", { products: c.products.length, houses: c.houses.length, origins: c.origins.length, citations: Object.keys(c.citations).length })}</p>
        </div>
      </section>

      <section aria-labelledby="cats" className="mt-14">
        <h2 id="cats" className="mb-5 text-3xl">{t("categories")}</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {cats.map((cat) => (
            <li key={cat.id}>
              <Link prefetch={false} href={href(locale, "/category/[slug]", { slug: cat.id })} className="card flex min-h-20 items-center justify-center p-4 text-center text-sand-100 no-underline hover:border-gold-500 hover:text-gold-300">{cat.name[locale]}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="latest" className="mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="latest" className="text-3xl">{t("latestProducts")}</h2>
          <Link prefetch={false} href={href(locale, "/products")} className="text-sm">{locale === "ar" ? "عرض الكل" : "View all"}</Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.products.slice(0, 8).map((p) => <li key={p.id}><ProductCard p={p} c={c} locale={locale} /></li>)}
        </ul>
      </section>

      <section aria-labelledby="orig" className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="card p-8">
          <h2 id="orig" className="mb-3 text-3xl">{t("originsTitle")}</h2>
          <p className="mb-6 text-sand-300">{t("originsText")}</p>
          <ul className="flex flex-wrap gap-2">
            {c.origins.map((o) => <li key={o.id}><Link prefetch={false} className="chip no-underline hover:border-gold-500" href={href(locale, "/oud-origins/[slug]", { slug: o.slug[locale] })}>{o.name[locale]}</Link></li>)}
          </ul>
        </div>
        <div className="card flex flex-col justify-between gap-6 p-8">
          <div>
            <h2 className="mb-3 text-3xl">{t("matcherTitle")}</h2>
            <p className="text-sand-300">{t("matcherText")}</p>
          </div>
          <Link prefetch={false} href={href(locale, "/matcher")} className="btn btn-gold self-start"><Icon name="spark" />{t("matcherCta")}</Link>
        </div>
      </section>

      <section aria-labelledby="cult" className="mt-14">
        <h2 id="cult" className="mb-5 text-3xl">{t("cultureTitle")}</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {culture.map((a) => (
            <li key={a.id} className="card relative p-6">
              <h3 className="mb-2 text-xl"><Link prefetch={false} className="no-underline after:absolute after:inset-0" href={href(locale, "/culture/[slug]", { slug: a.slug[locale] })}>{a.title[locale]}</Link></h3>
              <p className="text-sm text-sand-300">{a.summary[locale]}</p>
            </li>
          ))}
        </ul>
      </section>
      <p className="sr-only">{taxName(c, "category", "dehn-al-oud", locale)}</p>
    </>
  );
}
