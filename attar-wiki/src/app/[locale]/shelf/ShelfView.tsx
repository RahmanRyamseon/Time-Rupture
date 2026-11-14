"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { setShelf, shelfQueue, shelfStore, syncShelf } from "@/lib/client/shelf";
import { SHELF_STATUSES, type ShelfStatus } from "@/lib/types";

function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

export function ShelfView() {
  const t = useTranslations("shelf");
  const { user, enabled } = useAuth();
  const shelf = shelfStore.useStore();
  const queue = shelfQueue.useStore();
  const online = useOnline();
  const [tab, setTab] = useState<ShelfStatus>("own");

  useEffect(() => {
    if (user && online) void syncShelf();
  }, [user, online]);

  const entries = Object.values(shelf);
  const items = entries.filter((e) => e.status === tab).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mt-6">
      {!online ? (
        <p role="status" className="mb-4 rounded-lg bg-gold-soft/60 px-4 py-2 text-sm text-bark">
          {t("offline")}
        </p>
      ) : null}
      {enabled && !user ? (
        <p className="mb-4 rounded-lg border border-line bg-white px-4 py-3 text-sm">
          {t("signInToSync")} <Link href="/sign-in">→</Link>
        </p>
      ) : null}
      {user && online && queue.length === 0 && entries.length > 0 ? <p className="mb-4 text-xs text-muted">✓ {t("synced")}</p> : null}

      <div role="tablist" aria-label={t("title")} className="flex gap-2 border-b border-line">
        {SHELF_STATUSES.map((s) => {
          const count = entries.filter((e) => e.status === s).length;
          return (
            <button
              key={s}
              role="tab"
              id={`tab-${s}`}
              aria-selected={tab === s}
              aria-controls={`panel-${s}`}
              onClick={() => setTab(s)}
              className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold ${tab === s ? "border-amber text-bark" : "border-transparent text-muted"}`}
            >
              {t(s)} <span className="tabular-nums text-muted">({count})</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-sand/50 p-6 text-muted">{t("empty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.attarId} className="card flex items-center justify-between gap-3 p-4">
                <Link href={`/attars/${item.slug}`} className="font-display text-lg font-semibold">
                  {item.name}
                </Link>
                <button
                  type="button"
                  className="text-sm text-muted underline"
                  onClick={() => setShelf({ attarId: item.attarId, slug: item.slug, name: item.name, status: item.status }, null)}
                >
                  {t("remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
