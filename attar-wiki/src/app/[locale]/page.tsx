import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getHomeData } from "@/lib/data/wiki";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { pick } from "@/lib/i18n-content";
import { SearchBox } from "@/components/layout/SearchBox";
import { AttarCards } from "@/components/attar/AttarCards";
import { JsonLd } from "@/components/wiki/JsonLd";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 600;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    alternates: { canonical: absoluteUrl("/", locale), languages: { "en-IN": absoluteUrl("/", "en"), "hi-IN": absoluteUrl("/", "hi") } },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const data = await getHomeData();
  const empty = Object.values(data.counts).every((n) => !n);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl("/", locale),
          inLanguage: locale === "hi" ? "hi-IN" : "en-IN",
          potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl("/search", locale)}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <section className="relative overflow-hidden border-b border-line bg-bark text-parchment">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{ background: "radial-gradient(60rem 30rem at 85% -10%, #c9a24a 0%, transparent 60%)" }}
        />
        <div className="container-wiki relative py-14 sm:py-20">
          <p className="eyebrow text-gold-soft">{t("site.tagline")}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.1] text-parchment sm:text-6xl">{t("home.heroTitle")}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-sand">{t("home.heroBody")}</p>
          <div className="mt-8 max-w-xl text-ink">
            <SearchBox />
            <p className="mt-2 text-sm text-sand/90">{t("search.hint")}</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/attars" className="btn bg-gold text-ink hover:bg-gold-soft">
              {t("home.browseAll")}
            </Link>
            <Link href="/finder" className="btn border border-gold/60 text-parchment hover:bg-cocoa">
              <Icon name="spark" className="h-4 w-4" />
              {t("home.finder")}
            </Link>
          </div>
          {!empty ? (
            <p className="mt-6 text-sm text-sand/90">
              {t("home.stats", {
                attars: data.counts.attars,
                houses: data.counts.houses,
                notes: data.counts.notes,
                regions: data.counts.regions,
              })}
            </p>
          ) : null}
        </div>
      </section>

      <div className="container-wiki space-y-16 py-12">
        {empty ? (
          <section className="card mx-auto max-w-2xl p-8 text-center">
            <h2 className="text-2xl font-semibold">{t("home.emptyTitle")}</h2>
            <p className="mt-3 text-muted">{t("home.emptyBody")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/contribute" className="btn-primary">
                {t("nav.contribute")}
              </Link>
              <Link href="/about" className="btn-secondary">
                {t("nav.about")}
              </Link>
            </div>
          </section>
        ) : null}

        {data.recent.length ? (
          <section aria-labelledby="recent">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 id="recent" className="text-2xl font-semibold sm:text-3xl">
                {t("home.recent")}
              </h2>
              <Link href={{ pathname: "/attars", query: { sort: "updated" } }} className="text-sm font-semibold">
                {t("wiki.seeAll")}
              </Link>
            </div>
            <AttarCards attars={data.recent} />
          </section>
        ) : null}

        {data.notes.length ? (
          <section aria-labelledby="by-note">
            <h2 id="by-note" className="mb-5 text-2xl font-semibold sm:text-3xl">
              {t("home.notes")}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {data.notes.map((n) => (
                <li key={n.id}>
                  <Link href={`/notes/${n.slug}`} className="chip min-h-10 px-4">
                    {pick(locale, n.name, n.name_hi).text}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.regions.length ? (
          <section aria-labelledby="regions">
            <h2 id="regions" className="mb-5 text-2xl font-semibold sm:text-3xl">
              {t("home.regions")}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.regions.map((r) => (
                <li key={r.id}>
                  <Link href={`/regions/${r.slug}`} className="card block p-4 no-underline hover:shadow-md">
                    <span className="font-display text-lg font-semibold text-bark">{pick(locale, r.name, r.name_hi).text}</span>
                    {r.state ? <span className="block text-sm text-muted">{r.state}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.guides.length ? (
          <section aria-labelledby="guides">
            <h2 id="guides" className="mb-5 text-2xl font-semibold sm:text-3xl">
              {t("home.guides")}
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {data.guides.map((g) => (
                <li key={g.id} className="card p-5">
                  <h3 className="text-xl font-semibold">
                    <Link href={`/guides/${g.slug}`} className="text-bark no-underline hover:text-amber">
                      {pick(locale, g.title, g.title_hi).text}
                    </Link>
                  </h3>
                  {g.summary ? <p className="mt-2 text-sm text-muted">{g.summary}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
