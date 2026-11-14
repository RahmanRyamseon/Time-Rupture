import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent, getOrigin, staticSlugParams } from "@/lib/content";
import { href } from "@/lib/paths";
import { articleJsonLd, pageMeta } from "@/lib/seo";
import type { Locale } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CiteMarks, CiteRegistry, Undocumented } from "@/components/Cited";
import { Sources } from "@/components/Sources";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { EntityToolbar } from "@/components/EntityToolbar";

type Params = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() { return staticSlugParams((await getContent()).origins); }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const o = await getOrigin(slug);
  if (!o) return {};
  return pageMeta({ locale, type: "article", title: o.name[locale], description: o.smell[locale] || o.profile[locale] || o.name[locale], paths: { ar: href("ar", "/oud-origins/[slug]", { slug: o.slug.ar }), en: href("en", "/oud-origins/[slug]", { slug: o.slug.en }) } });
}

export default async function OriginPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const o = await getOrigin(slug);
  if (!o) notFound();
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "origins" });
  const n = await getTranslations({ locale, namespace: "nav" });
  const reg = new CiteRegistry();
  const editHref = href(locale, "/oud-origins/[slug]/edit", { slug: o.slug[locale] });
  const url = href(locale, "/oud-origins/[slug]", { slug: o.slug[locale] });
  const sections = (["profile", "smell", "grading", "uses"] as const).map((k) => ({ k, text: o[k][locale], nums: o[k][locale] ? reg.use(o.citations[k]) : [] }));
  const speciesNums = o.species ? reg.use(o.citations.species) : [];
  const products = c.products.filter((p) => p.origins.includes(o.id));
  return (
    <article>
      <JsonLd data={articleJsonLd({ locale, headline: o.name[locale], description: o.smell[locale] || o.profile[locale], url, dateModified: c.generatedAt.slice(0, 10), about: o.name.en })} />
      <Breadcrumbs label={n("primary")} items={[{ label: n("home"), href: href(locale, "/") }, { label: n("origins"), href: href(locale, "/oud-origins") }, { label: o.name[locale] }]} />
      <header className="mb-8 space-y-3">
        <h1 className="text-4xl sm:text-5xl">{o.name[locale]}</h1>
        <p className="text-sand-300">{t("region")}: {o.region[locale]}</p>
        {o.species && <p className="text-sm text-sand-300">{t("species")}: <i lang="la" dir="ltr">{o.species}</i><CiteMarks nums={speciesNums} /></p>}
      </header>
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.k} aria-labelledby={`o-${s.k}`}>
              <h2 id={`o-${s.k}`} className="mb-2 text-2xl">{t(s.k)}</h2>
              {s.text ? <p className="text-lg">{s.text}<CiteMarks nums={s.nums} /></p> : <Undocumented locale={locale} editHref={editHref} />}
            </section>
          ))}
          <section aria-labelledby="op">
            <h2 id="op" className="mb-4 text-2xl">{t("products")}</h2>
            {products.length ? <ul className="grid gap-4 sm:grid-cols-2">{products.slice(0, 12).map((p) => <li key={p.id}><ProductCard p={p} c={c} locale={locale} /></li>)}</ul> : <Undocumented locale={locale} />}
          </section>
        </div>
        <aside><EntityToolbar locale={locale} entityType="origin" entityId={o.id} editHref={editHref} historyHref={href(locale, "/oud-origins/[slug]/history", { slug: o.slug[locale] })} fields={["profile", "smell", "grading", "uses", "species"]} /></aside>
      </div>
      <Sources ids={reg.list()} citations={c.citations} locale={locale} />
    </article>
  );
}
