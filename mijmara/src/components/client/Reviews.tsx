"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Opt = { id: string; label: string };
type Review = { id: string; body: string; city: string | null; climate: string | null; created_at: string };

export function Reviews({ productId, climates }: { productId: string; climates: Opt[] }) {
  const t = useTranslations("product");
  const c = useTranslations("common");
  const sb = getBrowserSupabase();
  const [items, setItems] = useState<Review[]>([]);
  const [status, setStatus] = useState("");
  useEffect(() => {
    sb?.from("reviews").select("id,body,city,climate,created_at").eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setItems((data as Review[]) ?? []));
  }, [sb, productId]);
  async function submit(form: FormData) {
    if (!sb) return setStatus(c("communityOff"));
    const { data } = await sb.auth.getUser();
    if (!data.user) return setStatus(c("signInToContinue"));
    const body = String(form.get("body") ?? "").trim();
    if (body.length < 10) return;
    const { error } = await sb.from("reviews").insert({ product_id: productId, user_id: data.user.id, body, city: String(form.get("city") ?? "") || null, climate: String(form.get("climate") ?? "") || null });
    setStatus(error ? error.message : t("reviewPending"));
  }
  return (
    <div className="space-y-6">
      {items.length === 0 ? <p className="text-sand-300">{t("noReviews")}</p> : (
        <ul className="space-y-4">{items.map((r) => (
          <li key={r.id} className="card p-4"><p>{r.body}</p><p className="mt-2 text-xs text-sand-400">{[r.city, climates.find((x) => x.id === r.climate)?.label].filter(Boolean).join(" · ")}</p></li>
        ))}</ul>
      )}
      <details className="card p-4">
        <summary className="cursor-pointer font-medium text-gold-300">{t("writeReview")}</summary>
        <form action={submit} className="mt-4 grid gap-3">
          <label className="grid gap-1"><span>{t("reviewBody")}</span><textarea name="body" rows={4} required minLength={10} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1"><span>{t("city")}</span><input name="city" autoComplete="address-level2" /></label>
            <label className="grid gap-1"><span>{t("climate")}</span>
              <select name="climate"><option value="">—</option>{climates.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
            </label>
          </div>
          <button className="btn btn-gold justify-self-start">{t("submitReview")}</button>
          {status && <p role="status" className="text-sm text-sand-300">{status}</p>}
        </form>
      </details>
      {!sb && <p className="text-sm text-sand-400">{c("communityOff")}</p>}
    </div>
  );
}
