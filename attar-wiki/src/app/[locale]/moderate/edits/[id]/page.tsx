import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { diffWords } from "diff";
import { Link } from "@/i18n/navigation";
import { getModerator } from "@/lib/moderation";
import { SECTION_DEFS, TYPE_TO_SECTION } from "@/lib/sections";
import type { EntityType } from "@/lib/types";
import { Forbidden, ModShell } from "@/components/moderate/ModShell";
import { ModAction } from "@/components/moderate/ModAction";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review edit", robots: { index: false } };

const show = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : Array.isArray(v) && v.every((x) => typeof x !== "object") ? v.join(", ") : JSON.stringify(v, null, 2));

export default async function EditReview({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const mod = await getModerator();
  if (!mod) return <Forbidden />;
  const t = await getTranslations();
  const { data: s } = await mod.supabase.from("edit_suggestions").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const section = TYPE_TO_SECTION[s.entity_type as EntityType];
  const def = SECTION_DEFS[section];
  const { data: current } = s.entity_id
    ? await mod.supabase.from(def.table).select("*").eq("id", s.entity_id).maybeSingle()
    : { data: null };
  const proposed = s.proposed as { fields?: Record<string, unknown>; notes?: unknown; relations?: unknown; price_report?: unknown; citations?: unknown };
  const fields = proposed.fields ?? {};

  // Resolve ids to names for readability.
  const ids = [
    ...Object.values(fields),
    ...(((proposed.notes as { note_id: string }[]) ?? []).map((n) => n.note_id)),
  ].filter((v): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v));
  const lookups = ids.length
    ? await Promise.all(["houses", "regions", "notes"].map((tbl) => mod.supabase.from(tbl).select("id, name").in("id", ids)))
    : [];
  const names = new Map(lookups.flatMap((r) => (r.data ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
  const label = (v: unknown) => (typeof v === "string" && names.has(v) ? `${names.get(v)}` : show(v));

  return (
    <ModShell title={`${t(`types.${s.entity_type}`)} · ${s.summary}`}>
      {current ? (
        <p className="mb-6 text-sm">
          <Link href={`/${section}/${current.slug}`}>{current[def.titleField] as string} →</Link>
        </p>
      ) : (
        <p className="mb-6 text-sm">
          <span className="rounded-full bg-gold-soft px-2">{t("moderate.newPage")}</span>
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("moderate.proposed")}</h2>
          {Object.entries(fields).map(([k, v]) => (
            <section key={k} className="rounded-xl border border-line bg-white/70 p-4">
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-muted">{t.has(`field.${k}`) ? t(`field.${k}`) : k}</h3>
              <p className="mt-2 whitespace-pre-wrap break-words font-mono text-sm">
                {diffWords(label(current?.[k]), label(v)).map((p, i) =>
                  p.added ? (
                    <ins key={i} className="bg-ok/15 text-ok no-underline">
                      {p.value}
                    </ins>
                  ) : p.removed ? (
                    <del key={i} className="bg-danger/10 text-danger">
                      {p.value}
                    </del>
                  ) : (
                    <span key={i}>{p.value}</span>
                  ),
                )}
              </p>
            </section>
          ))}
          {(["notes", "relations", "price_report", "citations"] as const).map((k) =>
            proposed[k] ? (
              <section key={k} className="rounded-xl border border-line bg-white/70 p-4">
                <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-muted">{k.replace("_", " ")}</h3>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                  {k === "notes"
                    ? (proposed.notes as { note_id: string; position: string }[]).map((n) => `${n.position}: ${names.get(n.note_id) ?? n.note_id}`).join("\n")
                    : JSON.stringify(proposed[k], null, 2)}
                </pre>
              </section>
            ) : null,
          )}
        </div>
        {s.status === "pending" ? (
          <aside className="card space-y-4 p-4 lg:sticky lg:top-24 lg:self-start">
            <ModAction url={`/api/v1/edits/${s.id}`} body={{ action: "approve" }} label={t("moderate.approve")} variant="primary" withNote notePlaceholder={t("moderate.note")} />
            <ModAction url={`/api/v1/edits/${s.id}`} body={{ action: "reject" }} label={t("moderate.reject")} variant="danger" withNote notePlaceholder={t("moderate.note")} />
          </aside>
        ) : (
          <p className="text-muted">{s.status}</p>
        )}
      </div>
    </ModShell>
  );
}
