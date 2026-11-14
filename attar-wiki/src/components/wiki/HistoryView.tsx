import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getEntityRow, getRevisions } from "@/lib/data/wiki";
import { SECTION_DEFS, type Section } from "@/lib/sections";
import { formatDate } from "@/lib/i18n-content";

export async function HistoryView({ section, slug }: { section: Section; slug: string }) {
  const row = await getEntityRow(section, slug);
  if (!row) notFound();
  const def = SECTION_DEFS[section];
  const t = await getTranslations();
  const locale = await getLocale();
  const revisions = await getRevisions(def.type, row.id as string);
  const title = row[def.titleField] as string;

  return (
    <div className="container-wiki py-10">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link href={`/${section}/${slug}`}>← {title}</Link>
      </nav>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{t("history.title", { name: title })}</h1>
      <ol className="mt-8 divide-y divide-line rounded-xl border border-line bg-white/70">
        {revisions.map((r, i) => (
          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-bark">
                #{r.id} · {r.change_summary ?? "—"}
              </p>
              <p className="text-sm text-muted">
                <time dateTime={r.created_at}>{formatDate(r.created_at, locale)}</time> ·{" "}
                {t("history.by", { name: r.author?.display_name ?? t("history.anon") })}
                {i === revisions.length - 1 ? ` · ${t("history.firstRevision").split(":")[0]}` : ""}
              </p>
            </div>
            <Link href={`/${section}/${slug}/history/${r.id}`} className="text-sm font-semibold">
              {t("history.view")}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
