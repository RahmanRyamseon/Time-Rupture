"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { COLLECTION_KEY, type CollectionItem, type Shelf, onStoreChange, readJSON, writeJSON } from "@/lib/local-store";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const SHELVES: Shelf[] = ["owned", "tried", "wishlist"];

export function CollectionClient({ products }: { products: Record<string, { name: string; meta: string; href: string }> }) {
  const t = useTranslations("collection");
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [synced, setSynced] = useState(false);
  useEffect(() => { const load = () => setItems(readJSON<CollectionItem[]>(COLLECTION_KEY, [])); load(); return onStoreChange(load); }, []);
  // Merge the account shelf with the local one when signed in.
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: rows } = await sb.from("collection_items").select("product_id,shelf,created_at").eq("user_id", data.user.id);
      const local = readJSON<CollectionItem[]>(COLLECTION_KEY, []);
      const merged = new Map(local.map((x) => [x.id, x]));
      for (const r of rows ?? []) if (!merged.has(r.product_id)) merged.set(r.product_id, { id: r.product_id, shelf: r.shelf, added: r.created_at });
      const all = [...merged.values()];
      writeJSON(COLLECTION_KEY, all);
      await sb.from("collection_items").upsert(all.map((x) => ({ user_id: data.user!.id, product_id: x.id, shelf: x.shelf })));
      setSynced(true);
    });
  }, []);
  const known = items.filter((x) => products[x.id]);
  if (!known.length) return <p className="card p-6 text-sand-300">{t("empty")}</p>;
  return (
    <div className="space-y-10">
      {synced && <p className="text-sm text-gold-300">{t("synced")}</p>}
      {SHELVES.map((s) => {
        const list = known.filter((x) => x.shelf === s);
        if (!list.length) return null;
        return (
          <section key={s} aria-labelledby={`sh-${s}`}>
            <h2 id={`sh-${s}`} className="mb-4 text-2xl">{t(s)} <span className="text-base text-sand-400">({list.length})</span></h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((x) => (
                <li key={x.id} className="card flex items-start justify-between gap-3 p-4">
                  <div><Link href={products[x.id].href} className="text-lg">{products[x.id].name}</Link><p className="text-sm text-sand-300">{products[x.id].meta}</p></div>
                  <button type="button" className="btn btn-ghost !min-h-9 !px-2 text-xs" onClick={async () => {
                    writeJSON(COLLECTION_KEY, readJSON<CollectionItem[]>(COLLECTION_KEY, []).filter((y) => y.id !== x.id));
                    const sb = getBrowserSupabase(); const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
                    if (sb && data.user) await sb.from("collection_items").delete().eq("user_id", data.user.id).eq("product_id", x.id);
                  }}>{t("remove")}</button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
