import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent } from "@/lib/content";
import { ENTITY_ROUTES, href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import { FIELD_SPECS, findEntity, snapshotOf } from "@/lib/snapshot";
import { formatDate } from "@/lib/format";
import type { EntityType, Locale } from "@/lib/types";
import { Breadcrumbs } from "./Breadcrumbs";
import { PageHeader } from "./PageHeader";
import { EditForm } from "./client/EditForm";
import { HistoryClient } from "./client/HistoryClient";

const EDIT_ROUTES = { product: "/products/[slug]/edit", house: "/houses/[slug]/edit", origin: "/oud-origins/[slug]/edit", note: "/notes/[slug]/edit", culture: "/culture/[slug]/edit", guide: "/guides/[slug]/edit" } as const;
const HIST_ROUTES = { product: "/products/[slug]/history", house: "/houses/[slug]/history", origin: "/oud-origins/[slug]/history", note: "/notes/[slug]/history", culture: "/culture/[slug]/history", guide: "/guides/[slug]/history" } as const;

function entityName(e: NonNullable<ReturnType<typeof findEntity>>, locale: Locale): string {
  return "name" in e ? e.name[locale] : e.title[locale];
}

export async function editMeta(type: EntityType, mode: "edit" | "history", locale: Locale, slug: string): Promise<Metadata> {
  const c = await getContent();
  const e = findEntity(c, type, slug);
  if (!e) return {};
  const R = mode === "edit" ? EDIT_ROUTES : HIST_ROUTES;
  const t = await getTranslations({ locale, namespace: mode === "edit" ? "contribute" : "history" });
  const title = mode === "edit" ? t("editTitle", { name: entityName(e, locale) }) : t("title", { name: entityName(e, locale) });
  return pageMeta({ locale, title, description: title, noindex: true, paths: { ar: href("ar", R[type], { slug: e.slug.ar }), en: href("en", R[type], { slug: e.slug.en }) } });
}

export async function EditPage({ type, locale, slug }: { type: EntityType; locale: Locale; slug: string }) {
  setRequestLocale(locale);
  const c = await getContent();
  const e = findEntity(c, type, slug);
  if (!e) notFound();
  const t = await getTranslations({ locale, namespace: "contribute" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const name = entityName(e, locale);
  return (
    <>
      <Breadcrumbs label={nav("primary")} items={[{ label: nav("home"), href: href(locale, "/") }, { label: name, href: href(locale, ENTITY_ROUTES[type], { slug: e.slug[locale] }) }, { label: t("editTitle", { name: "" }).replace(/[:：]\s*$/, "") }]} />
      <PageHeader title={t("editTitle", { name })} intro={t("intro")} />
      <EditForm entityType={type} entityId={e.id} fields={FIELD_SPECS[type]} current={snapshotOf(type, e)} />
    </>
  );
}

export async function HistoryPage({ type, locale, slug }: { type: EntityType; locale: Locale; slug: string }) {
  setRequestLocale(locale);
  const c = await getContent();
  const e = findEntity(c, type, slug);
  if (!e) notFound();
  const t = await getTranslations({ locale, namespace: "history" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  const name = entityName(e, locale);
  return (
    <>
      <Breadcrumbs label={nav("primary")} items={[{ label: nav("home"), href: href(locale, "/") }, { label: name, href: href(locale, ENTITY_ROUTES[type], { slug: e.slug[locale] }) }, { label: t("title", { name: "" }).replace(/[:：]\s*$/, "") }]} />
      <PageHeader title={t("title", { name })} />
      <p className="card mb-6 p-4 text-sand-300">{t("seed", { date: formatDate(c.generatedAt.slice(0, 10), locale) })}</p>
      <HistoryClient entityType={type} entityId={e.id} />
    </>
  );
}

export async function entityStaticParams(type: EntityType) {
  const c = await getContent();
  const list = type === "product" ? c.products : type === "house" ? c.houses : type === "origin" ? c.origins : type === "note" ? c.notes : c.articles.filter((a) => a.kind === type);
  return list.flatMap((x) => [{ locale: "ar", slug: x.slug.ar }, { locale: "en", slug: x.slug.en }]);
}
