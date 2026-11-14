"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { COLLECTION_KEY, type CollectionItem, type Shelf, onStoreChange, readJSON, writeJSON } from "@/lib/local-store";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function CollectionButton({ id }: { id: string }) {
  const t = useTranslations("collection");
  const [item, setItem] = useState<CollectionItem | undefined>();
  useEffect(() => { const load = () => setItem(readJSON<CollectionItem[]>(COLLECTION_KEY, []).find((x) => x.id === id)); load(); return onStoreChange(load); }, [id]);

  async function set(shelf: Shelf | "") {
    const cur = readJSON<CollectionItem[]>(COLLECTION_KEY, []).filter((x) => x.id !== id);
    const next = shelf ? [...cur, { id, shelf, added: new Date().toISOString() }] : cur;
    writeJSON(COLLECTION_KEY, next);
    const sb = getBrowserSupabase();
    const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
    if (sb && data.user) {
      if (shelf) await sb.from("collection_items").upsert({ user_id: data.user.id, product_id: id, shelf });
      else await sb.from("collection_items").delete().eq("user_id", data.user.id).eq("product_id", id);
    }
  }
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t("shelf")}</span>
      <select value={item?.shelf ?? ""} onChange={(e) => set(e.target.value as Shelf | "")} className="min-h-11">
        <option value="">＋ {t("title")}</option>
        <option value="owned">{t("owned")}</option>
        <option value="tried">{t("tried")}</option>
        <option value="wishlist">{t("wishlist")}</option>
      </select>
    </label>
  );
}
