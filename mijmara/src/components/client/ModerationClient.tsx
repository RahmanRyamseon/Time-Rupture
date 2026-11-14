"use client";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Row = Record<string, unknown> & { id: number | string };
const TABS = ["revisions", "reviews", "media", "flags"] as const;
type Tab = (typeof TABS)[number];

export function ModerationClient() {
  const t = useTranslations("moderation");
  const c = useTranslations("common");
  const sb = getBrowserSupabase();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("revisions");
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!sb) return setAllowed(false);
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setAllowed(false);
      const { data: p } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      setAllowed(p?.role === "editor" || p?.role === "admin");
    });
  }, [sb]);

  const load = useCallback(async () => {
    if (!sb || !allowed) return;
    const q = {
      revisions: sb.from("revisions").select("id,entity_type,entity_id,op,summary,diff,citations,created_at").eq("status", "pending").order("created_at"),
      reviews: sb.from("reviews").select("id,product_id,body,city,climate,created_at").eq("status", "pending").order("created_at"),
      media: sb.from("media").select("id,entity_id,storage_path,license,credit,source_url,created_at").eq("status", "pending").order("created_at"),
      flags: sb.from("citation_flags").select("id,entity_type,entity_id,field,reason,created_at").eq("status", "open").order("created_at"),
    }[tab];
    const { data } = await q;
    setRows((data as Row[]) ?? []);
  }, [sb, allowed, tab]);
  useEffect(() => { load(); }, [load]);

  async function act(id: Row["id"], approve: boolean) {
    if (!sb) return;
    const call = {
      revisions: () => sb.rpc("moderate_revision", { rev_id: id, approve }),
      reviews: () => sb.from("reviews").update({ status: approve ? "approved" : "rejected" }).eq("id", id),
      media: () => sb.rpc("moderate_media", { media_id: id, approve }),
      flags: () => sb.from("citation_flags").update({ status: "resolved" }).eq("id", id),
    }[tab];
    const { error } = await call();
    setMsg(error ? error.message : "✓");
    load();
  }

  if (!sb) return <p className="card p-6 text-sand-300">{c("communityOff")}</p>;
  if (allowed === null) return <p>{c("loading")}</p>;
  if (!allowed) return <p className="card p-6">{t("forbidden")}</p>;
  return (
    <div className="space-y-6">
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`btn text-sm ${tab === k ? "btn-gold" : "btn-ghost"}`}>{t(k)}</button>)}
      </div>
      {msg && <p role="status" className="text-sm text-sand-300">{msg}</p>}
      {rows.length === 0 ? <p className="text-sand-300">{t("empty")}</p> : (
        <ul className="space-y-4" role="tabpanel">
          {rows.map((r) => (
            <li key={String(r.id)} className="card space-y-3 p-5">
              <pre dir="ltr" className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-oud-950 p-3 text-start text-xs">{JSON.stringify(r, null, 2)}</pre>
              <div className="flex gap-2">
                <button className="btn btn-gold text-sm" onClick={() => act(r.id, true)}>{tab === "flags" ? t("resolve") : t("approve")}</button>
                {tab !== "flags" && <button className="btn btn-ghost text-sm" onClick={() => act(r.id, false)}>{t("reject")}</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
