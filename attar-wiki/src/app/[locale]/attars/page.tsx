import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { browseAttars, getFacets, type BrowseFilters } from "@/lib/data/wiki";
import { pageMetadata } from "@/lib/metadata";
import { formatInr, pick } from "@/lib/i18n-content";
import { ATTAR_TYPES } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

type SP = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<SP> };

const PRICE_BANDS: Record<string, [number | undefined, number | undefined]> = {
  "0-500": [undefined, 500],
  "500-2000": [500, 2000],
  "2000-5000": [2000, 5000],
  "5000+": [5000, undefined],
};

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale });
  const filtered = Object.keys(sp).some((k) => k !== "page");
  // Filtered variants are not indexed (avoid thin duplicate pages).
  return pageMetadata("/attars", locale, t("browse.title"), t("site.description"), filtered ? { robots: { index: false, follow: true } } : {});
}

export default async function BrowsePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const loc = await getLocale();

  const price = PRICE_BANDS[one(sp.price) ?? ""] ?? [undefined, undefined];
  const weather = one(sp.weather);
  const longevity = Number(one(sp.longevity));
  const filters: BrowseFilters = {
    family: one(sp.family),
    type: ATTAR_TYPES.includes(one(sp.type) as never) ? one(sp.type) : undefined,
    note: one(sp.note),
    house: one(sp.house),
    region: one(sp.region),
    weather: weather === "heat" || weather === "humidity" || weather === "winter" ? weather : undefined,
    longevity: longevity >= 1 && longevity <= 5 ? longevity : undefined,
    priceMin: price[0],
    priceMax: price[1],
    sort: (["name", "updated", "longevity", "weather", "price"] as const).find((s) => s === one(sp.sort)) ?? "name",
    page: Math.max(1, Number(one(sp.page)) || 1),
    pageSize: 24,
  };

  const [{ rows, total }, facets] = await Promise.all([browseAttars(filters), getFacets()]);
  const pages = Math.max(1, Math.ceil(total / 24));
  const current = Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const pageHref = (p: number) => ({ pathname: "/attars" as const, query: { ...current, page: String(p) } });
  const activeCount = ["family", "type", "note", "house", "region", "weather", "longevity", "price"].filter((k) => current[k]).length;

  const select = (prefix: string, name: string, label: string, options: { value: string; label: string }[]) => (
    <div>
      <label htmlFor={`${prefix}-${name}`} className="label">
        {label}
      </label>
      <select id={`${prefix}-${name}`} name={name} defaultValue={current[name] ?? ""} className="input">
        <option value="">{t("browse.any")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  const filterForm = (prefix: string) => (
          <form method="get" className="mt-4 space-y-4 lg:mt-0" aria-label={t("browse.filters")}>
            {select(prefix, "family", t("browse.family"), facets.families.map((f) => ({ value: f, label: f })))}
            {select(prefix, "type", t("browse.type"), ATTAR_TYPES.map((v) => ({ value: v, label: t(`attarType.${v}`) })))}
            {select(prefix, "note", t("browse.note"), facets.notes.map((n) => ({ value: n.slug, label: n.name })))}
            {select(prefix, "house", t("browse.house"), facets.houses.map((n) => ({ value: n.slug, label: n.name })))}
            {select(prefix, "region", t("browse.region"), facets.regions.map((n) => ({ value: n.slug, label: n.name })))}
            {select(prefix, "weather", t("browse.weather"), [
              { value: "heat", label: t("metric.heat") },
              { value: "humidity", label: t("metric.humidity") },
              { value: "winter", label: t("metric.winter") },
            ])}
            {select(prefix, 
              "longevity",
              t("browse.longevity"),
              [3, 4, 4.5].map((v) => ({ value: String(v), label: `≥ ${v} / 5` })),
            )}
            {select(prefix, 
              "price",
              t("browse.price"),
              Object.keys(PRICE_BANDS).map((v) => ({ value: v, label: `₹${v}` })),
            )}
            {select(prefix, "sort", t("browse.sort"), [
              { value: "updated", label: t("browse.sortUpdated") },
              { value: "longevity", label: t("browse.sortLongevity") },
              { value: "weather", label: t("browse.sortWeather") },
              { value: "price", label: t("browse.sortPrice") },
            ])}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">
                {t("browse.apply")}
              </button>
              <Link href="/attars" className="btn-ghost">
                {t("browse.reset")}
              </Link>
            </div>
          </form>
  );

  return (
    <div className="container-wiki py-10">
      <header className="border-b border-line pb-6">
        <h1 className="text-4xl font-semibold">{t("browse.title")}</h1>
        <p className="mt-2 text-muted" aria-live="polite">
          {t("browse.results", { count: total })}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden lg:block">{filterForm("d")}</div>
        <details className="lg:hidden" open={activeCount > 0 ? true : undefined}>
          <summary className="btn-secondary w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            {t("browse.filters")}
            {activeCount ? ` (${activeCount})` : ""}
          </summary>
          {filterForm("m")}
        </details>

        <div>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-sand/50 p-8 text-center text-muted">
              <p>{t("browse.results", { count: 0 })}</p>
              <Link href="/new/attars" className="mt-3 inline-flex items-center gap-1 font-semibold">
                <Icon name="plus" className="h-4 w-4" />
                {t("wiki.proposePage")}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((a) => (
                <li key={a.id} className="card group relative flex flex-col p-4 hover:shadow-md">
                  <h2 className="text-lg font-semibold leading-snug">
                    <Link href={`/attars/${a.slug}`} className="text-bark no-underline after:absolute after:inset-0 group-hover:text-amber">
                      {pick(loc, a.name, a.name_hi).text}
                    </Link>
                  </h2>
                  {a.house_name ? <p className="text-sm text-muted">{t("attar.madeBy", { house: a.house_name })}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {a.attar_type ? <span className="rounded-full bg-sand px-2 py-0.5 text-cocoa">{t(`attarType.${a.attar_type}`)}</span> : null}
                    {a.scent_family ? <span className="rounded-full bg-sand px-2 py-0.5 text-cocoa">{a.scent_family}</span> : null}
                  </div>
                  {a.summary ? <p className="mt-2 line-clamp-2 text-sm text-ink/80">{a.summary}</p> : null}
                  <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1 pt-3 text-xs text-muted">
                    {a.longevity_count > 0 ? (
                      <>
                        <dt>{t("metric.longevity")}</dt>
                        <dd className="text-right tabular-nums">
                          {Number(a.longevity_avg).toFixed(1)}/5 · {t("attar.votes", { count: a.longevity_count })}
                        </dd>
                      </>
                    ) : null}
                    {filters.weather && a.weather_count > 0 ? (
                      <>
                        <dt>{t(`metric.${filters.weather}`)}</dt>
                        <dd className="text-right tabular-nums">
                          {Number(a.weather_avg).toFixed(1)}/5 · {t("attar.votes", { count: a.weather_count })}
                        </dd>
                      </>
                    ) : null}
                    {a.per10_min != null ? (
                      <>
                        <dt>₹ / 10 ml</dt>
                        <dd className="text-right tabular-nums">
                          {formatInr(Number(a.per10_min), loc)}–{formatInr(Number(a.per10_max), loc)}
                        </dd>
                      </>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
          )}

          {pages > 1 ? (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-3 text-sm">
              {filters.page! > 1 ? (
                <Link href={pageHref(filters.page! - 1)} className="btn-secondary" rel="prev">
                  {t("browse.prev")}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">{t("browse.page", { page: filters.page!, pages })}</span>
              {filters.page! < pages ? (
                <Link href={pageHref(filters.page! + 1)} className="btn-secondary" rel="next">
                  {t("browse.next")}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
