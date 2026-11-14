"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Icon } from "../Icon";

export function FlagButton({ entityType, entityId, fields }: { entityType: string; entityId: string; fields: string[] }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const sb = getBrowserSupabase();
  async function submit(form: FormData) {
    if (!sb) return setStatus(t("communityOff"));
    const { data } = await sb.auth.getUser();
    if (!data.user) return setStatus(t("signInToContinue"));
    const { error } = await sb.from("citation_flags").insert({ entity_type: entityType, entity_id: entityId, field: String(form.get("field")), reason: String(form.get("reason") ?? ""), user_id: data.user.id });
    setStatus(error ? error.message : t("flagged"));
  }
  return (
    <div className="relative">
      <button type="button" className="btn btn-ghost text-sm" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="flag" className="h-4 w-4" />{t("flag")}</button>
      {open && (
        <form action={submit} className="card absolute end-0 z-30 mt-2 w-72 space-y-2 p-4">
          <select name="field" className="w-full" aria-label={t("flag")}>{fields.map((f) => <option key={f} value={f}>{f}</option>)}</select>
          <textarea name="reason" rows={2} className="w-full" />
          <button className="btn btn-gold w-full">{t("flag")}</button>
          {status && <p role="status" className="text-sm text-sand-300">{status}</p>}
        </form>
      )}
    </div>
  );
}
