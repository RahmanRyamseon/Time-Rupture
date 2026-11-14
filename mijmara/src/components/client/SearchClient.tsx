"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { search, type SearchDoc, type SearchKind } from "@/lib/search";
import type { Locale } from "@/lib/types";
import { Icon } from "../Icon";

const KINDS: SearchKind[] = ["product", "house", "origin", "note", "culture", "guide"];

export function SearchClient({ locale, contributeHref }: { locale: Locale; contributeHref: string }) {
  const t = useTranslations("search");
  const cm = useTranslations("common");
  const params = useSearchParams();
  const router = useRouter();
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [kinds, setKinds] = useState<SearchKind[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch("/search-index.json").then((r) => r.json()).then(setDocs).catch(() => setDocs([])); }, []);
  useEffect(() => {
    const id = setTimeout(() => {
      const url = new URL(window.location.href);
      if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
      router.replace(url.pathname + url.search, { scroll: false });
    }, 300);
    return () => clearTimeout(id);
  }, [q, router]);

  const result = useMemo(() => (docs && q.trim() ? search(docs, q, kinds) : null), [docs, q, kinds]);

  return (
    <div className="space-y-6">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex gap-2">
        <label htmlFor="q" className="sr-only">{t("label")}</label>
        <input ref={inputRef} id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("placeholder")} autoFocus className="min-h-12 flex-1 text-lg" autoComplete="off" enterKeyHint="search" />
        <button className="btn btn-gold min-h-12" aria-label={t("title")}><Icon name="search" /></button>
      </form>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("title")}>
        {KINDS.map((k) => {
          const on = kinds.includes(k);
          return <button key={k} type="button" aria-pressed={on} onClick={() => setKinds(on ? kinds.filter((x) => x !== k) : [...kinds, k])} className={`chip min-h-9 cursor-pointer ${on ? "!border-gold-500 !bg-gold-500 !text-ink" : ""}`}>{t(`kinds.${k}`)}</button>;
        })}
      </div>
      <div aria-live="polite">
        {!docs && <p className="text-sand-300">{cm("loading")}</p>}
        {result && (
          <>
            <p className="mb-3 text-sm text-sand-300">{result.fuzzy && result.hits.length ? t("fuzzy", { q }) : cm("results", { count: result.hits.length })}</p>
            {result.hits.length === 0 ? (
              <p className="card p-6">{t("empty")} <Link href={contributeHref}>{cm("undocumented").split("—")[1]?.trim()}</Link></p>
            ) : (
              <ul className="space-y-3">
                {result.hits.slice(0, 50).map(({ doc }) => (
                  <li key={doc.kind + doc.id} className="card relative p-4">
                    <p className="text-xs text-gold-400">{t(`kinds.${doc.kind}`)}</p>
                    <Link href={doc.href[locale]} className="text-lg no-underline after:absolute after:inset-0">{doc.title[locale]}</Link>
                    <p className="line-clamp-2 text-sm text-sand-300">{doc.subtitle[locale]}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
