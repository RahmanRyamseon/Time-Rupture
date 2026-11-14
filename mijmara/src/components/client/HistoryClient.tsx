"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { communityEnabled, loadSupabase, useSupabase } from "@/lib/supabase/browser";

type Rev = { id: number; status: "pending" | "approved" | "rejected"; summary: string; created_at: string; diff: { field: string; before: string; after: string }[]; author: { username: string | null } | null };

export function HistoryClient({ entityType, entityId }: { entityType: string; entityId: string }) {
  const t = useTranslations("history");
  const c = useTranslations("common");
  const locale = useLocale();
  const sb = useSupabase();
  const [revs, setRevs] = useState<Rev[] | null>(null);
  useEffect(() => {
    if (!sb) return;
    sb.from("revisions").select("id,status,summary,created_at,diff,author:profiles(username)").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setRevs((data as unknown as Rev[]) ?? []));
  }, [sb, entityType, entityId]);
  if (!communityEnabled) return <p className="text-sand-400">{c("communityOff")}</p>;
  if (!sb) return <p>{c("loading")}</p>;
  if (!revs) return <p>{c("loading")}</p>;
  if (!revs.length) return <p className="text-sand-300">{t("empty")}</p>;
  return (
    <ol className="space-y-4">
      {revs.map((r) => (
        <li key={r.id} className="card p-5">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="chip">{t(r.status)}</span>
            <span className="text-sand-300">{new Date(r.created_at).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB")}</span>
            <span className="text-sand-300">{t("author")}: {r.author?.username ?? "—"}</span>
          </div>
          <p className="mb-3">{r.summary}</p>
          <details>
            <summary className="cursor-pointer text-gold-300">{t("diff")} ({r.diff?.length ?? 0})</summary>
            <dl className="mt-3 space-y-3 text-sm">
              {(r.diff ?? []).map((d) => (
                <div key={d.field}>
                  <dt className="font-mono text-xs text-gold-400" dir="ltr">{d.field}</dt>
                  <dd className="rounded bg-red-950/40 p-2 line-through decoration-red-400/60">{d.before || "∅"}</dd>
                  <dd className="mt-1 rounded bg-emerald-950/40 p-2">{d.after || "∅"}</dd>
                </div>
              ))}
            </dl>
          </details>
        </li>
      ))}
    </ol>
  );
}
