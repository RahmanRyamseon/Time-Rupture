import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getArticle, getContent } from "@/lib/content";
import { ENTITY_ROUTES, href } from "@/lib/paths";
import { articleJsonLd, pageMeta } from "@/lib/seo";
import { formatDate, readingMinutes } from "@/lib/format";
import type { ArticleKind, Locale } from "@/lib/types";
import { PageHeader } from "./PageHeader";
import { Breadcrumbs } from "./Breadcrumbs";
import { Prose } from "./Prose";
import { Sources } from "./Sources";
import { JsonLd } from "./JsonLd";
import { EntityToolbar } from "./EntityToolbar";

const LIST = { culture: "/culture", guide: "/guides" } as const;
const EDIT = { culture: "/culture/[slug]/edit", guide: "/guides/[slug]/edit" } as const;
const HIST = { culture: "/culture/[slug]/history", guide: "/guides/[slug]/history" } as const;

export async function articleListMeta(kind: ArticleKind, locale: Locale): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "articles" });
  const k = kind === "culture" ? "culture" : "guides";
  return pageMeta({ locale, title: t(`${k}Title`), description: t(`${k}Intro`), paths: { ar: href("ar", LIST[kind]), en: href("en", LIST[kind]) } });
}

export async function ArticleList({ kind, locale }: { kind: ArticleKind; locale: Locale }) {
  setRequestLocale(locale);
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "articles" });
  const k = kind === "culture" ? "culture" : "guides";
  const items = c.articles.filter((a) => a.kind === kind);
  return (
    <>
      <PageHeader title={t(`${k}Title`)} intro={t(`${k}Intro`)} />
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((a) => (
          <li key={a.id} className="card relative p-6">
            <h2 className="mb-2 text-2xl"><Link prefetch={false} className="no-underline after:absolute after:inset-0" href={href(locale, ENTITY_ROUTES[kind], { slug: a.slug[locale] })}>{a.title[locale]}</Link></h2>
            <p className="text-sand-300">{a.summary[locale]}</p>
            <p className="mt-3 text-xs text-sand-400">{t("readingTime", { min: readingMinutes(a.body[locale]) })}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

export async function articleStaticParams(kind: ArticleKind) {
  const c = await getContent();
  return c.articles.filter((a) => a.kind === kind).flatMap((a) => [{ locale: "ar", slug: a.slug.ar }, { locale: "en", slug: a.slug.en }]);
}

export async function articleMeta(kind: ArticleKind, locale: Locale, slug: string): Promise<Metadata> {
  const a = await getArticle(kind, slug);
  if (!a) return {};
  return pageMeta({ locale, type: "article", title: a.title[locale], description: a.summary[locale], paths: { ar: href("ar", ENTITY_ROUTES[kind], { slug: a.slug.ar }), en: href("en", ENTITY_ROUTES[kind], { slug: a.slug.en }) } });
}

export async function ArticleDetail({ kind, locale, slug }: { kind: ArticleKind; locale: Locale; slug: string }) {
  setRequestLocale(locale);
  const a = await getArticle(kind, slug);
  if (!a) notFound();
  const c = await getContent();
  const nav = await getTranslations({ locale, namespace: "nav" });
  const cm = await getTranslations({ locale, namespace: "common" });
  const t = await getTranslations({ locale, namespace: "articles" });
  const body = a.body[locale];
  // Number citations in order of first appearance in this language's body.
  const order: string[] = [];
  for (const m of body.matchAll(/\{\{cite:([\w-]+)\}\}/g)) if (!order.includes(m[1])) order.push(m[1]);
  const nums = new Map(order.map((id, i) => [id, i + 1]));
  const url = href(locale, ENTITY_ROUTES[kind], { slug: a.slug[locale] });
  return (
    <article>
      <JsonLd data={articleJsonLd({ locale, headline: a.title[locale], description: a.summary[locale], url, dateModified: a.updated, citations: order.map((id) => c.citations[id]?.url).filter(Boolean) as string[] })} />
      <Breadcrumbs label={nav("primary")} items={[{ label: nav("home"), href: href(locale, "/") }, { label: nav(kind === "culture" ? "culture" : "guides"), href: href(locale, LIST[kind]) }, { label: a.title[locale] }]} />
      <header className="mb-8 max-w-3xl space-y-3">
        <h1 className="text-4xl sm:text-5xl">{a.title[locale]}</h1>
        <p className="text-lg text-sand-300">{a.summary[locale]}</p>
        <p className="text-sm text-sand-400">{cm("updated")}: {formatDate(a.updated, locale)} · {t("readingTime", { min: readingMinutes(body) })}</p>
      </header>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,48rem)_1fr]">
        <Prose text={body} citeNumbers={nums} />
        <aside><EntityToolbar locale={locale} entityType={kind} entityId={a.id} editHref={href(locale, EDIT[kind], { slug: a.slug[locale] })} historyHref={href(locale, HIST[kind], { slug: a.slug[locale] })} fields={["body", "title", "summary"]} /></aside>
      </div>
      <Sources ids={order} citations={c.citations} locale={locale} />
    </article>
  );
}
