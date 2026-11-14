import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getModerator } from "@/lib/moderation";
import { entityPath } from "@/lib/sections";
import type { EntityType } from "@/lib/types";
import { Forbidden, ModShell } from "@/components/moderate/ModShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Most-viewed pages lacking data", robots: { index: false } };

export default async function DataGaps({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const mod = await getModerator();
  if (!mod) return <Forbidden />;
  const t = await getTranslations();
  const { data } = await mod.supabase.rpc("data_gaps", { p_days: 30, p_limit: 100 });
  const rows = (data ?? []) as { entity_type: EntityType; entity_id: string; slug: string; title: string; views: number; missing: string[] }[];
  return (
    <ModShell title={t("moderate.dataGaps")}>
      <p className="mb-4 text-sm text-muted">30 days</p>
      {rows.length === 0 ? (
        <p className="text-muted">{t("moderate.nothing")}</p>
      ) : (
        <ol className="divide-y divide-line rounded-xl border border-line bg-white/70">
          {rows.map((r) => (
            <li key={`${r.entity_type}-${r.entity_id}`} className="flex flex-wrap items-baseline justify-between gap-3 p-4">
              <div>
                <Link href={entityPath(r.entity_type, r.slug)} className="font-medium">
                  {r.title}
                </Link>
                <span className="ml-2 text-xs text-muted">{t(`types.${r.entity_type}`)}</span>
                <p className="text-sm text-muted">
                  {t("moderate.missing", { fields: r.missing.map((f) => (t.has(`field.${f}`) ? t(`field.${f}`) : f)).join(", ") })}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="tabular-nums">{t("moderate.views", { count: r.views })}</p>
                <Link href={`${entityPath(r.entity_type, r.slug)}/edit`}>{t("wiki.suggestEdit")}</Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ModShell>
  );
}
