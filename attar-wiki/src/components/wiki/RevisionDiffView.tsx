import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { diffWords } from "diff";
import { Link } from "@/i18n/navigation";
import { getEntityRow, getRevisionPair } from "@/lib/data/wiki";
import { SECTION_DEFS, type Section } from "@/lib/sections";
import { formatDate } from "@/lib/i18n-content";

const HIDDEN = new Set(["id", "published", "created_at", "updated_at"]);

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.every((x) => typeof x !== "object")) return v.join(", ");
  if (Array.isArray(v)) return v.map((x) => Object.values(x as Record<string, unknown>).filter((y) => y != null && y !== "").join(" · ")).join("\n");
  return JSON.stringify(v, null, 2);
}

export async function RevisionDiffView({ section, slug, revisionId }: { section: Section; slug: string; revisionId: number }) {
  const row = await getEntityRow(section, slug);
  if (!row || !Number.isInteger(revisionId)) notFound();
  const def = SECTION_DEFS[section];
  const pair = await getRevisionPair(def.type, row.id as string, revisionId);
  if (!pair) notFound();
  const t = await getTranslations();
  const locale = await getLocale();
  const cur = pair.current.snapshot;
  const prev = pair.previous?.snapshot ?? {};
  const order = [...def.fields.map((f) => f.name), "notes", "relations", "price_reports", "citations"];
  const keys = [...new Set([...order, ...Object.keys(cur), ...Object.keys(prev)])].filter((k) => !HIDDEN.has(k));
  const changed = keys.filter((k) => asText(cur[k]) !== asText(prev[k]));

  return (
    <div className="container-wiki py-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-4 text-sm">
        <Link href={`/${section}/${slug}`}>← {row[def.titleField] as string}</Link>
        <Link href={`/${section}/${slug}/history`}>{t("wiki.history")}</Link>
      </nav>
      <h1 className="mt-3 text-3xl font-semibold">{t("history.diffTitle", { id: revisionId })}</h1>
      <p className="mt-2 text-muted">
        {pair.current.change_summary ?? "—"} · {formatDate(pair.current.created_at, locale)} ·{" "}
        {t("history.by", { name: pair.author ?? t("history.anon") })}
      </p>
      {!pair.previous ? <p className="mt-4 rounded-lg bg-sand px-4 py-2 text-sm">{t("history.firstRevision")}</p> : null}
      {changed.length === 0 ? <p className="mt-6 text-muted">{t("history.unchanged")}</p> : null}

      <div className="mt-8 space-y-6">
        {changed.map((k) => {
          const parts = diffWords(asText(prev[k]), asText(cur[k]));
          return (
            <section key={k} className="rounded-xl border border-line bg-white/70 p-4">
              <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-muted">
                {t.has(`field.${k}`) ? t(`field.${k}`) : k}
              </h2>
              <p className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                {parts.map((p, i) =>
                  p.added ? (
                    <ins key={i} className="rounded bg-ok/15 text-ok no-underline">
                      {p.value}
                    </ins>
                  ) : p.removed ? (
                    <del key={i} className="rounded bg-danger/10 text-danger">
                      {p.value}
                    </del>
                  ) : (
                    <span key={i}>{p.value}</span>
                  ),
                )}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
