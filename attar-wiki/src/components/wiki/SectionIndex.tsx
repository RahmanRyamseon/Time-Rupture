import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listSection } from "@/lib/data/wiki";
import { SECTION_DEFS, type Section } from "@/lib/sections";
import { pick } from "@/lib/i18n-content";
import { Icon } from "@/components/ui/Icon";

type Row = Record<string, unknown> & { id: string; slug: string };

function subtitleFor(section: Section, row: Row) {
  switch (section) {
    case "houses":
      return [row.city, row.founded_year].filter(Boolean).join(" · ");
    case "notes":
      return [row.botanical_name, row.category].filter(Boolean).join(" · ");
    case "regions":
      return (row.state as string) ?? "";
    case "glossary":
      return (row.short_definition as string) ?? "";
    case "guides":
      return [row.author_name, row.summary].filter(Boolean).join(" · ");
    default:
      return "";
  }
}

/** A–Z list of a section with the "Propose a new page" action. */
export async function SectionIndex({ section, intro }: { section: Exclude<Section, "attars">; intro?: string }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const rows = (await listSection(section)) as Row[];
  const def = SECTION_DEFS[section];
  const titleOf = (r: Row) =>
    pick(locale, r[def.titleField] as string, r[`${def.titleField}_hi`] as string | null).text ?? (r[def.titleField] as string);

  const groups = new Map<string, Row[]>();
  const grouped = section !== "guides";
  for (const r of rows) {
    const key = grouped ? (titleOf(r).charAt(0).toUpperCase() || "#") : "";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <div className="container-wiki py-10">
      <header className="border-b border-line pb-6">
        <h1 className="text-4xl font-semibold">{t(`sections.${section}`)}</h1>
        {intro ? <p className="reading mt-3 text-lg text-muted">{intro}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted">{t("wiki.inThisWiki", { count: rows.length })}</span>
          <Link href={`/new/${section}`} className="inline-flex items-center gap-1 font-semibold">
            <Icon name="plus" className="h-4 w-4" />
            {t("wiki.proposePage")}
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line bg-sand/50 p-6 text-muted">{t("wiki.emptySection")}</p>
      ) : (
        <div className="mt-8 space-y-8">
          {grouped ? (
            <nav aria-label="A–Z" className="flex flex-wrap gap-1 text-sm">
              {[...groups.keys()].map((k) => (
                <a key={k} href={`#letter-${k}`} className="chip min-h-9 min-w-9 justify-center">
                  {k}
                </a>
              ))}
            </nav>
          ) : null}
          {[...groups.entries()].map(([letter, items]) => (
            <section key={letter || "all"} id={grouped ? `letter-${letter}` : undefined} aria-label={letter || undefined}>
              {grouped ? <h2 className="mb-3 text-2xl text-cocoa">{letter}</h2> : null}
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => (
                  <li key={r.id}>
                    <Link href={`/${section}/${r.slug}`} className="card block h-full p-4 no-underline hover:shadow-md">
                      <span className="font-display text-lg font-semibold text-bark">{titleOf(r)}</span>
                      {subtitleFor(section, r) ? (
                        <span className="mt-1 line-clamp-2 block text-sm text-muted">{subtitleFor(section, r)}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
