import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent, getProduct, similarProducts, staticSlugParams, taxName } from "@/lib/content";
import { href } from "@/lib/paths";
import { articleJsonLd, pageMeta } from "@/lib/seo";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import type { Locale, NoteRef } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CiteMarks, CiteRegistry, CitedValue, Undocumented } from "@/components/Cited";
import { Sources } from "@/components/Sources";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { EntityToolbar } from "@/components/EntityToolbar";
import { Icon } from "@/components/Icon";
import { CompareButton } from "@/components/client/CompareButton";
import { CollectionButton } from "@/components/client/CollectionButton";
import { VotePanel } from "@/components/client/VotePanel";
import { Reviews } from "@/components/client/Reviews";

type Params = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  return staticSlugParams((await getContent()).products);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const c = await getContent();
  const house = c.houses.find((h) => h.id === p.houseId);
  return pageMeta({
    locale, type: "article",
    title: `${p.name[locale]} — ${house?.name[locale] ?? ""}`,
    description: p.description[locale] || `${p.name[locale]} · ${taxName(c, "category", p.category, locale)}`,
    paths: { ar: href("ar", "/products/[slug]", { slug: p.slug.ar }), en: href("en", "/products/[slug]", { slug: p.slug.en }) },
  });
}

export default async function ProductPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = await getProduct(slug);
  if (!p) notFound();
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "product" });
  const n = await getTranslations({ locale, namespace: "nav" });
  const cm = await getTranslations({ locale, namespace: "common" });
  const house = c.houses.find((h) => h.id === p.houseId)!;
  const reg = new CiteRegistry();
  const editHref = href(locale, "/products/[slug]/edit", { slug: p.slug[locale] });
  const cite = (field: string) => reg.use(p.citations[field]);
  const sep = locale === "ar" ? "، " : ", ";
  const url = href(locale, "/products/[slug]", { slug: p.slug[locale] });
  const tax = (type: string) => (c.taxonomy[type] ?? []).map((x) => ({ id: x.id, label: x.name[locale] }));
  const noteLabel = (r: NoteRef) => {
    const note = c.notes.find((x) => x.id === r.note)!;
    const name = note.name[locale];
    const origin = r.origin ? taxName(c, "origin_group", r.origin, locale) : "";
    const label = origin ? (locale === "ar" ? `${name.replace(/ \(.*\)$/, "")} ${origin}` : `${origin} ${name.replace(/ \(.*\)$/, "")}`) : name;
    return <Link prefetch={false} href={href(locale, "/notes/[slug]", { slug: note.slug[locale] })} className="chip no-underline hover:border-gold-500">{label}</Link>;
  };
  const tiers = [["top", p.notes.top], ["heart", p.notes.heart], ["base", p.notes.base]] as const;
  const hasNotes = tiers.some(([, l]) => l.length > 0);
  const similar = similarProducts(c, p);
  const size = p.size.note[locale] || (p.size.value !== null ? `${formatNumber(p.size.value, locale)} ${taxName(c, "unit", p.size.unit, locale)}` : "");

  const descNums = reg.use(p.citations.description);
  const notesNums = reg.use(p.citations.notes);
  // Body rows: label + content (rendered as a definition list)
  const rows: { k: string; v: React.ReactNode }[] = [
    { k: t("house"), v: <Link prefetch={false} href={href(locale, "/houses/[slug]", { slug: house.slug[locale] })}>{house.name[locale]}</Link> },
    { k: t("category"), v: <Link prefetch={false} href={href(locale, "/category/[slug]", { slug: p.category })}>{taxName(c, "category", p.category, locale)}</Link> },
    { k: t("origin"), v: <CitedValue value={p.origins.length ? "x" : ""} nums={cite("origins")} locale={locale} editHref={editHref}>
        <span className="inline-flex flex-wrap gap-1.5">{p.origins.map((o) => {
          const og = c.origins.find((x) => x.id === o);
          const label = taxName(c, "origin_group", o, locale);
          return og ? <Link prefetch={false} key={o} className="chip no-underline" href={href(locale, "/oud-origins/[slug]", { slug: og.slug[locale] })}>{label}</Link> : <span key={o} className="chip">{label}</span>;
        })}</span>
      </CitedValue> },
    { k: t("wild"), v: p.wildStatus && p.wildStatus !== "undocumented" ? <CitedValue value={taxName(c, "wild_status", p.wildStatus, locale)} nums={cite("wild_status")} locale={locale} editHref={editHref} /> : <Undocumented locale={locale} editHref={editHref} /> },
    { k: t("occasions"), v: <CitedValue value={p.occasions.map((o) => taxName(c, "occasion", o, locale)).join(sep)} nums={cite("occasions")} locale={locale} editHref={editHref} /> },
    { k: t("seasons"), v: <CitedValue value={p.seasons.map((o) => taxName(c, "season", o, locale)).join(sep)} nums={cite("seasons")} locale={locale} editHref={editHref} /> },
    { k: t("size"), v: <CitedValue value={size} nums={cite("size")} locale={locale} editHref={editHref} /> },
  ];
  const priceNums = p.prices.map((pr) => reg.use([pr.citationId])[0]);

  return (
    <article>
      <JsonLd data={articleJsonLd({ locale, headline: p.name[locale], description: p.description[locale], url, dateModified: c.generatedAt.slice(0, 10), about: `${p.name.en} (${house.name.en})`, citations: Object.values(p.citations).flat().map((id) => c.citations[id]?.url).filter(Boolean) as string[] })} />
      <Breadcrumbs label={n("primary")} items={[{ label: n("home"), href: href(locale, "/") }, { label: n("products"), href: href(locale, "/products") }, { label: p.name[locale] }]} />
      <header className="mb-8 space-y-4">
        <p className="text-sm text-gold-400">{taxName(c, "category", p.category, locale)} · {house.name[locale]}</p>
        <h1 className="text-4xl sm:text-5xl">{p.name[locale]}</h1>
        <p className="text-sand-300" lang={locale === "ar" ? "en" : "ar"} dir={locale === "ar" ? "ltr" : "rtl"}>{p.name[locale === "ar" ? "en" : "ar"]}</p>
        <div className="flex flex-wrap items-center gap-2">
          <CompareButton id={p.id} compareHref={href(locale, "/compare")} />
          <CollectionButton id={p.id} />
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          <section aria-labelledby="desc-h">
            <h2 id="desc-h" className="sr-only">{locale === "ar" ? "الوصف" : "Description"}</h2>
            {p.description[locale] ? <p className="text-lg">{p.description[locale]}<CiteMarks nums={descNums} /></p> : <Undocumented locale={locale} editHref={editHref} />}
          </section>

          <section aria-labelledby="notes-h" className="card p-6">
            <h2 id="notes-h" className="mb-4 text-2xl">{t("notes")}<CiteMarks nums={notesNums} /></h2>
            {hasNotes ? (
              <dl className="grid gap-4 sm:grid-cols-3">
                {tiers.map(([k, list]) => (
                  <div key={k}>
                    <dt className="mb-2 text-sm text-gold-400">{t(k)}</dt>
                    <dd>{list.length ? <ul className="flex flex-wrap gap-1.5">{list.map((r, i) => <li key={i}>{noteLabel(r)}</li>)}</ul> : <span className="text-sand-400">—</span>}</dd>
                  </div>
                ))}
              </dl>
            ) : <Undocumented locale={locale} editHref={editHref} />}
          </section>

          <section aria-labelledby="facts-h">
            <h2 id="facts-h" className="sr-only">{locale === "ar" ? "البيانات" : "Facts"}</h2>
            <dl className="divide-y divide-oud-700 overflow-hidden rounded-2xl border border-oud-700">
              {rows.map((r) => (
                <div key={r.k} className="grid gap-1 bg-oud-950/60 px-5 py-4 sm:grid-cols-[11rem_1fr]">
                  <dt className="text-gold-300">{r.k}</dt><dd>{r.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="prices-h">
            <h2 id="prices-h" className="mb-2 text-2xl">{t("prices")}</h2>
            <p className="mb-4 text-sm text-sand-300">{t("priceNote")}</p>
            {p.prices.length ? (
              <div className="table-scroll rounded-2xl border border-oud-700">
                <table>
                  <thead><tr><th scope="col">{locale === "ar" ? "السعر" : "Price"}</th><th scope="col">{t("size")}</th><th scope="col">{t("observed")}</th><th scope="col">{cm("source")}</th></tr></thead>
                  <tbody>{p.prices.map((pr, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap">{formatPrice(pr.min, pr.max, pr.currency, locale)}</td>
                      <td>{pr.sizeText[locale]}</td>
                      <td className="whitespace-nowrap">{formatDate(pr.observedOn, locale)}</td>
                      <td>{pr.note[locale]} <CiteMarks nums={[priceNums[i]]} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <Undocumented locale={locale} editHref={editHref} />}
          </section>

          <section aria-labelledby="perf-h" className="card p-6">
            <h2 id="perf-h" className="mb-4 text-2xl">{t("performance")}</h2>
            <VotePanel productId={p.id} scales={{ strength: tax("strength"), longevity: tax("longevity"), sillage: tax("sillage") }} seasons={tax("season").filter((s) => s.id !== "all")} />
          </section>

          <section aria-labelledby="rev-h">
            <h2 id="rev-h" className="mb-4 text-2xl">{t("reviews")}</h2>
            <Reviews productId={p.id} climates={tax("climate")} />
          </section>

          <p className="text-sm text-sand-400">{t("authenticityNote")}</p>
        </div>

        <aside className="space-y-6">
          <div className="card space-y-3 p-5">
            <h2 className="text-lg">{t("media")}</h2>
            <p className="text-sm text-sand-300">{t("noMedia")}</p>
          </div>
          {p.officialUrl && (
            <a href={p.officialUrl} rel="noopener noreferrer nofollow" target="_blank" className="btn btn-ghost w-full">
              {t("officialPage")} <Icon name="external" className="h-4 w-4" />
            </a>
          )}
          <EntityToolbar locale={locale} entityType="product" entityId={p.id} editHref={editHref} historyHref={href(locale, "/products/[slug]/history", { slug: p.slug[locale] })} fields={["description", "origins", "notes", "occasions", "seasons", "size", "prices", "wild_status"]} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="sim-h" className="mt-14">
          <h2 id="sim-h" className="text-2xl">{t("similar")}</h2>
          <p className="mb-4 text-sm text-sand-300">{t("similarNote")}</p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{similar.map((s) => <li key={s.id}><ProductCard p={s} c={c} locale={locale} /></li>)}</ul>
        </section>
      )}

      <Sources ids={reg.list()} citations={c.citations} locale={locale} />
    </article>
  );
}
