/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getModerator } from "@/lib/moderation";
import { mediaUrl } from "@/components/wiki/MediaFigure";
import { Forbidden, ModShell } from "@/components/moderate/ModShell";
import { ModAction } from "@/components/moderate/ModAction";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pending images", robots: { index: false } };

export default async function MediaQueue({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const mod = await getModerator();
  if (!mod) return <Forbidden />;
  const t = await getTranslations();
  const { data } = await mod.supabase.from("media").select("*").eq("status", "pending").order("created_at").limit(100);
  const items = data ?? [];
  return (
    <ModShell title={t("moderate.pendingMedia")}>
      {items.length === 0 ? (
        <p className="text-muted">{t("moderate.nothing")}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((m) => (
            <li key={m.id} className="card overflow-hidden">
              <img src={mediaUrl(m.storage_path)} alt={m.alt} className="aspect-video w-full bg-sand object-contain" loading="lazy" />
              <div className="space-y-1 p-4 text-sm">
                <p>
                  <strong>{t(`types.${m.entity_type}`)}</strong> · {m.alt}
                </p>
                <p>
                  {m.license} · {m.credit}
                </p>
                {m.source_url ? (
                  <p className="break-all">
                    <a href={m.source_url} rel="nofollow noopener" target="_blank">
                      {m.source_url}
                    </a>
                  </p>
                ) : null}
                {m.permission_note ? <p className="italic text-muted">{m.permission_note}</p> : null}
                <div className="flex gap-2 pt-2">
                  <ModAction url={`/api/v1/media/${m.id}`} body={{ action: "approve", primary: true }} label={t("moderate.approve")} variant="primary" />
                  <ModAction url={`/api/v1/media/${m.id}`} body={{ action: "reject" }} label={t("moderate.reject")} variant="danger" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModShell>
  );
}
