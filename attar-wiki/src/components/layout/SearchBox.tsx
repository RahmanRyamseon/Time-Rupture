"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { entityPath } from "@/lib/sections";
import type { SearchHit } from "@/lib/types";

export function SearchBox({ compact = false, defaultValue = "", autoFocus = false }: { compact?: boolean; defaultValue?: string; autoFocus?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}&limit=8`, { signal: ctrl.signal });
        if (res.ok) {
          const body = (await res.json()) as { results: SearchHit[] };
          setHits(body.results);
          setOpen(true);
          setActive(-1);
        }
      } catch {
        /* aborted or offline */
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [q]);

  const visible = q.trim().length >= 2 ? hits : [];

  function go(hit?: SearchHit) {
    setOpen(false);
    if (hit) router.push(entityPath(hit.entity_type, hit.slug));
    else if (q.trim()) router.push({ pathname: "/search", query: { q: q.trim() } });
  }

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        go(active >= 0 ? visible[active] : undefined);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        {t("search.label")}
      </label>
      <input
        id={`${listId}-input`}
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => visible.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, visible.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, -1));
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={t("search.placeholder")}
        className={`input rounded-full pl-4 ${compact ? "min-h-10 text-sm" : "min-h-12"}`}
        role="combobox"
        aria-expanded={open && visible.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        enterKeyHint="search"
      />
      {open && visible.length > 0 ? (
        <ul id={listId} role="listbox" className="card absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-auto p-1">
          {visible.map((h, i) => (
            <li
              key={`${h.entity_type}-${h.entity_id}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(h);
              }}
              className={`cursor-pointer rounded-lg px-3 py-2 ${i === active ? "bg-sand" : "hover:bg-sand"}`}
            >
              <span className="block font-medium text-bark">{locale === "hi" && h.title_hi ? h.title_hi : h.title}</span>
              <span className="block text-xs text-muted">
                {t(`types.${h.entity_type}`)}
                {h.subtitle ? ` · ${h.subtitle}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
