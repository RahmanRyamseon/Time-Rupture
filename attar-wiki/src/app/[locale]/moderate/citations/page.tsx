import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getModerator } from "@/lib/moderation";
import { entityPath } from "@/lib/sections";
import type { EntityType } from "@/lib/types";
import { Forbidden, ModShell } from "@/components/moderate/ModShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pages needing citations", robots: { index: false } };

export default async function CitationGaps({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const mod = await getModerator();
  if (!mod) return <Forbidden />;
  const t = await getTranslations();
  const { data } = await mod.supabase.rpc("citation_gaps", { p_limit: 300 });
  const rows = (data ?? []) as { entity_type: EntityType; entity_id: string; slug: string; title: string; fields: string[] }[];
  return (
    <ModShell title={t("moderate.citationGaps")}>
      {rows.length === 0 ? (
        <p className="text-muted">{t("moderate.nothing")}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th scope="col" className="py-2">{t("field.title")}</th>
              <th scope="col" className="py-2">{t("wiki.needsCitation")}</th>
              <th scope="col" className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.entity_type}-${r.entity_id}`} className="border-b border-line/60 align-top">
                <td className="py-2 pr-3">
                  <span className="text-xs text-muted">{t(`types.${r.entity_type}`)}</span>
                  <br />
                  <Link href={entityPath(r.entity_type, r.slug)}>{r.title}</Link>
                </td>
                <td className="py-2 pr-3">{r.fields.map((f) => (t.has(`field.${f}`) ? t(`field.${f}`) : f)).join(", ")}</td>
                <td className="py-2">
                  <Link href={`${entityPath(r.entity_type, r.slug)}/edit`}>{t("wiki.suggestEdit")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModShell>
  );
}
