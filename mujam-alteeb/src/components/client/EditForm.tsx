"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { communityEnabled, loadSupabase, useSupabase } from "@/lib/supabase/browser";
import { diffSnapshots } from "@/lib/snapshot";

type Field = { key: string; long?: boolean; dir?: "ltr" | "rtl" };

/**
 * Proposes a revision: the full new snapshot plus the per-field citation URLs.
 * The database trigger stores the diff against the published version; editors approve it.
 */
export function EditForm({ entityType, entityId, fields, current }: { entityType: string; entityId: string; fields: Field[]; current: Record<string, string> }) {
  const t = useTranslations("contribute");
  const c = useTranslations("common");
  const sb = useSupabase();
  const [values, setValues] = useState(current);
  const [cites, setCites] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const changed = diffSnapshots(current, values);

  async function submit(form: FormData) {
    if (!sb) return setStatus(c("communityOff"));
    const { data } = await sb.auth.getUser();
    if (!data.user) return setStatus(c("signInToContinue"));
    if (!changed.length) return;
    // Every changed non-empty factual field needs a source URL.
    const missing = changed.filter((d) => d.after && !/^https?:\/\/\S+$/.test(cites[d.field] ?? ""));
    if (missing.length) return setStatus(`${t("citationRequired")}: ${missing.map((m) => m.field).join(", ")}`);
    const { error } = await sb.from("revisions").insert({
      entity_type: entityType, entity_id: entityId, op: "update", author_id: data.user.id,
      snapshot: values, summary: String(form.get("summary") ?? ""),
      citations: changed.filter((d) => cites[d.field]).map((d) => ({ field: d.field, url: cites[d.field] })),
    });
    setStatus(error ? error.message : t("submitted"));
  }

  return (
    <form action={submit} className="space-y-6">
      {!communityEnabled && <p className="card p-4 text-sand-300">{c("communityOff")}</p>}
      <p className="text-sm text-sand-300">{t("fieldsHint")}</p>
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((f) => {
          const isChanged = (values[f.key] ?? "") !== (current[f.key] ?? "");
          const Input = f.long ? "textarea" : "input";
          return (
            <div key={f.key} className={`card space-y-2 p-4 ${f.long ? "md:col-span-2" : ""} ${isChanged ? "!border-gold-500" : ""}`}>
              <label className="grid gap-1">
                <span className="font-mono text-xs text-gold-400" dir="ltr">{f.key}</span>
                <Input dir={f.dir} rows={f.long ? 6 : undefined} value={values[f.key] ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [f.key]: e.target.value })} className="w-full" />
              </label>
              {isChanged && (
                <label className="grid gap-1 text-sm">
                  <span>{t("citationUrl")}</span>
                  <input type="url" dir="ltr" required={Boolean(values[f.key])} value={cites[f.key] ?? ""} onChange={(e) => setCites({ ...cites, [f.key]: e.target.value })} placeholder="https://" />
                </label>
              )}
            </div>
          );
        })}
      </div>
      <label className="grid max-w-2xl gap-1"><span>{t("summary")}</span><input name="summary" required minLength={5} /></label>
      <button className="btn btn-gold" disabled={!changed.length}>{t("submit")} ({changed.length})</button>
      {status && <p role="status" className="text-sand-300">{status}</p>}
    </form>
  );
}
