import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent, getHouse, staticSlugParams } from "@/lib/content";
import { href } from "@/lib/paths";
import { articleJsonLd, pageMeta } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CiteMarks, CiteRegistry, CitedValue, Undocumented } from "@/components/Cited";
import { Sources } from "@/components/Sources";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { EntityToolbar } from "@/components/EntityToolbar";
import { Icon } from "@/components/Icon";

type Params = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() { return staticSlugParams((await getContent()).houses); }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const h = await getHouse(slug);
  if (!h) return {};
  return pageMeta({ locale, type: "article", title: h.name[locale], description: h.history[locale] || h.name[locale], paths: { ar: href("ar", "/houses/[slug]", { slug: h.slug.ar }), en: href("en", "/houses/[slug]", { slug: h.slug.en }) } });
}

export default async function HousePage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const h = await getHouse(slug);
  if (!h) notFound();
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "houses" });
  const n = await getTranslations({ locale, namespace: "nav" });
  const cm = await getTranslations({ locale, namespace: "common" });
  const reg = new CiteRegistry();
  const cite = (f: string) => reg.use(h.citations[f]);
  const editHref = href(locale, "/houses/[slug]/edit", { slug: h.slug[locale] });
  const url = href(locale, "/houses/[slug]", { slug: h.slug[locale] });
  const historyNums = cite("history");
  const rows = [
    { k: t("country"), v: <CitedValue value={h.country[locale]} nums={cite("country")} locale={locale} editHref={editHref} /> },
    { k: t("city"), v: <CitedValue value={h.city[locale]} nums={cite("city")} locale={locale} editHref={editHref} /> },
    { k: t("founded"), v: <CitedValue value={h.foundedYear} nums={cite("founded_year")} locale={locale} editHref={editHref} /> },
    { k: t("founder"), v: <CitedValue value={h.founder[locale]} nums={cite("founder")} locale={locale} editHref={editHref} /> },
  ];
  const products = c.products.filter((p) => p.houseId === h.id);
  return (
    <article>
      <JsonLd data={articleJsonLd({ locale, headline: h.name[locale], description: h.history[locale], url, dateModified: c.generatedAt.slice(0, 10), about: h.name.en, citations: Object.values(h.citations).flat().map((id) => c.citations[id]?.url).filter(Boolean) as string[] })} />
      <Breadcrumbs label={n("primary")} items={[{ label: n("home"), href: href(locale, "/") }, { label: n("houses"), href: href(locale, "/houses") }, { label: h.name[locale] }]} />
      <header className="mb-8 space-y-3">
        <h1 className="text-4xl sm:text-5xl">{h.name[locale]}</h1>
        <p className="text-sand-300" lang={locale === "ar" ? "en" : "ar"}>{h.name[locale === "ar" ? "en" : "ar"]}</p>
      </header>
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <section aria-labelledby="hist">
            <h2 id="hist" className="mb-3 text-2xl">{t("history")}</h2>
            {h.history[locale] ? <p className="text-lg">{h.history[locale]}<CiteMarks nums={historyNums} /></p> : <Undocumented locale={locale} editHref={editHref} />}
          </section>
          <dl className="divide-y divide-oud-700 overflow-hidden rounded-2xl border border-oud-700">
            {rows.map((r) => <div key={r.k} className="grid gap-1 bg-oud-950/60 px-5 py-4 sm:grid-cols-[11rem_1fr]"><dt className="text-gold-300">{r.k}</dt><dd>{r.v}</dd></div>)}
          </dl>
          <section aria-labelledby="hp">
            <h2 id="hp" className="mb-4 text-2xl">{t("products")}</h2>
            {products.length ? <ul className="grid gap-4 sm:grid-cols-2">{products.map((p) => <li key={p.id}><ProductCard p={p} c={c} locale={locale} /></li>)}</ul> : <Undocumented locale={locale} />}
          </section>
        </div>
        <aside className="space-y-4">
          {h.officialWebsite ? (
            <a href={h.officialWebsite} rel="noopener noreferrer nofollow" target="_blank" className="btn btn-ghost w-full">{cm("officialWebsite")} <Icon name="external" className="h-4 w-4" /></a>
          ) : <p className="card p-4 text-sm"><span className="text-sand-300">{cm("officialWebsite")}: </span><Undocumented locale={locale} editHref={editHref} /></p>}
          <EntityToolbar locale={locale} entityType="house" entityId={h.id} editHref={editHref} historyHref={href(locale, "/houses/[slug]/history", { slug: h.slug[locale] })} fields={["history", "country", "city", "founded_year", "founder", "official_website"]} />
        </aside>
      </div>
      <Sources ids={reg.list()} citations={c.citations} locale={locale} />
    </article>
  );
}
