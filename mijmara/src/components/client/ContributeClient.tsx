"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { communityEnabled, loadSupabase, useSupabase } from "@/lib/supabase/browser";

const TYPES = ["product", "house", "origin", "note", "culture", "guide"] as const;
const LICENSES = ["own-work", "cc-by", "cc-by-sa", "cc0", "brand-permission"] as const;

export function ContributeClient({ products }: { products: { id: string; label: string }[] }) {
  const t = useTranslations("contribute");
  const s = useTranslations("search");
  const c = useTranslations("common");
  const sb = useSupabase();
  const [status, setStatus] = useState("");
  const [imgStatus, setImgStatus] = useState("");

  async function user() {
    if (!sb) { return null; }
    const { data } = await sb.auth.getUser();
    return data.user;
  }

  async function propose(form: FormData) {
    if (!sb) return setStatus(c("communityOff"));
    const u = await user();
    if (!u) return setStatus(c("signInToContinue"));
    const url = String(form.get("citation") ?? "");
    if (!/^https?:\/\/\S+$/.test(url)) return setStatus(t("citationRequired"));
    const snapshot = { name_ar: String(form.get("name_ar") ?? ""), name_en: String(form.get("name_en") ?? ""), description_ar: String(form.get("details") ?? "") };
    const { error } = await sb.from("revisions").insert({ entity_type: String(form.get("type")), entity_id: null, op: "create", author_id: u.id, snapshot, summary: String(form.get("summary") ?? ""), citations: [{ field: "*", url }] });
    setStatus(error ? error.message : t("submitted"));
  }

  async function upload(form: FormData) {
    if (!sb) return setImgStatus(c("communityOff"));
    const u = await user();
    if (!u) return setImgStatus(c("signInToContinue"));
    const file = form.get("file") as File | null;
    if (!file || !file.size) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > 5 * 1024 * 1024) return setImgStatus("JPEG/PNG/WebP/AVIF ≤ 5 MB");
    const path = `pending/${u.id}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const up = await sb.storage.from("media").upload(path, file, { contentType: file.type });
    if (up.error) return setImgStatus(up.error.message);
    const { error } = await sb.from("media").insert({ entity_type: "product", entity_id: String(form.get("product")), storage_path: path, license: String(form.get("license")), credit: String(form.get("credit")), source_url: String(form.get("source") ?? "") || null, uploaded_by: u.id });
    setImgStatus(error ? error.message : t("submitted"));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form action={propose} className="card space-y-4 p-6">
        <h2 className="text-2xl">{t("newEntry")}</h2>
        <label className="grid gap-1"><span>{t("type")}</span><select name="type">{TYPES.map((k) => <option key={k} value={k}>{s(`kinds.${k}`)}</option>)}</select></label>
        <label className="grid gap-1"><span>name_ar</span><input name="name_ar" dir="rtl" required /></label>
        <label className="grid gap-1"><span>name_en</span><input name="name_en" dir="ltr" /></label>
        <label className="grid gap-1"><span>{locale_label()}</span><textarea name="details" rows={5} /></label>
        <label className="grid gap-1"><span>{t("citationUrl")}</span><input type="url" name="citation" dir="ltr" required placeholder="https://" /></label>
        <label className="grid gap-1"><span>{t("summary")}</span><input name="summary" required /></label>
        <button className="btn btn-gold">{t("submit")}</button>
        {status && <p role="status" className="text-sm text-sand-300">{status}</p>}
      </form>
      <form action={upload} className="card space-y-4 p-6">
        <h2 className="text-2xl">{t("upload")}</h2>
        <label className="grid gap-1"><span>{s("kinds.product")}</span><select name="product">{products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        <label className="grid gap-1"><span>JPEG / PNG / WebP</span><input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" required /></label>
        <label className="grid gap-1"><span>{t("license")}</span><select name="license" required>{LICENSES.map((l) => <option key={l} value={l}>{t(`licenses.${l}`)}</option>)}</select></label>
        <label className="grid gap-1"><span>{t("credit")}</span><input name="credit" required /></label>
        <label className="grid gap-1"><span>{t("citationUrl")}</span><input type="url" name="source" dir="ltr" placeholder="https://" /></label>
        <button className="btn btn-gold">{t("submit")}</button>
        {imgStatus && <p role="status" className="text-sm text-sand-300">{imgStatus}</p>}
      </form>
    </div>
  );
  function locale_label() { return "description"; }
}
