import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getModerator } from "@/lib/moderation";
import { formatDate } from "@/lib/i18n-content";
import { Forbidden, ModShell } from "@/components/moderate/ModShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pending edits", robots: { index: false } };

export default async function EditsQueue({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const mod = await getModerator();
  if (!mod) return <Forbidden />;
  const t = await getTranslations();
  const loc = await getLocale();
  const { data } = await mod.supabase
    .from("edit_suggestions")
    .select("id, entity_type, entity_id, summary, created_at, submitted_by")
    .eq("status", "pending")
    .order("created_at")
    .limit(200);
  const edits = data ?? [];
  const ids = [...new Set(edits.map((e) => e.submitted_by as string))];
  const { data: profiles } = ids.length ? await mod.supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));

  return (
    <ModShell title={t("moderate.pendingEdits")}>
      {edits.length === 0 ? (
        <p className="text-muted">{t("moderate.nothing")}</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white/70">
          {edits.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-3 p-4">
              <div>
                <p className="font-medium">
                  {t(`types.${e.entity_type}`)}
                  {!e.entity_id ? <span className="ml-2 rounded-full bg-gold-soft px-2 text-xs">{t("moderate.newPage")}</span> : null} · {e.summary}
                </p>
                <p className="text-sm text-muted">
                  {names.get(e.submitted_by as string) ?? "—"} · {formatDate(e.created_at as string, loc)}
                </p>
              </div>
              <Link href={`/moderate/edits/${e.id}`} className="text-sm font-semibold">
                {t("history.view")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ModShell>
  );
}
