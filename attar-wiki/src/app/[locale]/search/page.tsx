import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { search } from "@/lib/data/wiki";
import { entityPath } from "@/lib/sections";
import { pageMetadata } from "@/lib/metadata";
import { SearchBox } from "@/components/layout/SearchBox";
import type { EntityType } from "@/lib/types";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; type?: string }> };

const TYPES: EntityType[] = ["attar", "note", "house", "region", "glossary", "guide"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata("/search", locale, t("nav.search"), null, { robots: { index: false, follow: true } });
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q = "", type } = await searchParams;
  const t = await getTranslations();
  const typeFilter = TYPES.find((x) => x === type);
  const hits = q.trim() ? await search(q, typeFilter ? [typeFilter] : undefined, 50) : [];

  return (
    <div className="container-wiki py-10">
      <h1 className="text-4xl font-semibold">{t("nav.search")}</h1>
      <div className="mt-6 max-w-2xl">
        <SearchBox defaultValue={q} autoFocus={!q} />
        <p className="help">{t("search.hint")}</p>
      </div>

      {q.trim() ? (
        <section className="mt-10" aria-labelledby="results">
          <h2 id="results" className="text-xl font-semibold">
            {t("search.results", { q })}
          </h2>
          <nav aria-label="Filter by type" className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href={{ pathname: "/search", query: { q } }} className={`chip ${!typeFilter ? "border-amber bg-sand" : ""}`}>
              {t("browse.any")}
            </Link>
            {TYPES.map((ty) => (
              <Link key={ty} href={{ pathname: "/search", query: { q, type: ty } }} className={`chip ${typeFilter === ty ? "border-amber bg-sand" : ""}`}>
                {t(`types.${ty}`)}
              </Link>
            ))}
          </nav>
          {hits.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-line bg-sand/50 p-6 text-muted">
              <p>{t("search.none")}</p>
              <Link href="/new/attars" className="mt-2 inline-block font-semibold">
                {t("wiki.proposePage")}
              </Link>
            </div>
          ) : (
            <ol className="mt-6 divide-y divide-line">
              {hits.map((h) => (
                <li key={`${h.entity_type}-${h.entity_id}`} className="py-4">
                  <p className="eyebrow">{t(`types.${h.entity_type}`)}</p>
                  <Link href={entityPath(h.entity_type, h.slug)} className="font-display text-xl font-semibold">
                    {locale === "hi" && h.title_hi ? h.title_hi : h.title}
                  </Link>
                  {h.subtitle ? <p className="text-sm text-muted">{h.subtitle}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}
