import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent, getNote, staticSlugParams, taxName } from "@/lib/content";
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

export async function generateStaticParams() { return staticSlugParams((await getContent()).notes); }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const x = await getNote(slug);
  if (!x) return {};
  return pageMeta({ locale, type: "article", title: x.name[locale], description: x.description[locale] || x.name[locale], paths: { ar: href("ar", "/notes/[slug]", { slug: x.slug.ar }), en: href("en", "/notes/[slug]", { slug: x.slug.en }) } });
}

export default async function NotePage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const x = await getNote(slug);
  if (!x) notFound();
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "notes" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const reg = new CiteRegistry();
  const nums = x.description[locale] ? reg.use(x.citations.description) : [];
  const editHref = href(locale, "/notes/[slug]/edit", { slug: x.slug[locale] });
  const url = href(locale, "/notes/[slug]", { slug: x.slug[locale] });
  const products = c.products.filter((p) => [...p.notes.top, ...p.notes.heart, ...p.notes.base].some((r) => r.note === x.id));
  return (
    <article>
      <JsonLd data={articleJsonLd({ locale, headline: x.name[locale], description: x.description[locale], url, dateModified: c.generatedAt.slice(0, 10), about: x.name.en })} />
      <Breadcrumbs label={nav("primary")} items={[{ label: nav("home"), href: href(locale, "/") }, { label: nav("notes"), href: href(locale, "/notes") }, { label: x.name[locale] }]} />
      <header className="mb-8 space-y-2">
        <p className="text-sm text-gold-400">{t("family")}: {taxName(c, "character", x.family, locale)}</p>
        <h1 className="text-4xl sm:text-5xl">{x.name[locale]}</h1>
      </header>
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          {x.description[locale] ? <p className="text-lg">{x.description[locale]}<CiteMarks nums={nums} /></p> : <Undocumented locale={locale} editHref={editHref} />}
          <section aria-labelledby="np">
            <h2 id="np" className="mb-4 text-2xl">{t("products")}</h2>
            {products.length ? <ul className="grid gap-4 sm:grid-cols-2">{products.map((p) => <li key={p.id}><ProductCard p={p} c={c} locale={locale} /></li>)}</ul> : <Undocumented locale={locale} />}
          </section>
        </div>
        <aside><EntityToolbar locale={locale} entityType="note" entityId={x.id} editHref={editHref} historyHref={href(locale, "/notes/[slug]/history", { slug: x.slug[locale] })} fields={["description", "family"]} /></aside>
      </div>
      <Sources ids={reg.list()} citations={c.citations} locale={locale} />
    </article>
  );
}
