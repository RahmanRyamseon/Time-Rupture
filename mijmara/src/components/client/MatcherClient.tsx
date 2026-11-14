"use client";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/types";
import { Icon } from "../Icon";

type Opt = { id: string; label: string };
type Res = { mode: "ai" | "rules"; results: { id: string; reason: string }[] };

export function MatcherClient({ locale, options, products }: { locale: Locale; options: Record<"occasion" | "season" | "character" | "strength", Opt[]>; products: Record<string, { name: string; house: string; href: string }> }) {
  const t = useTranslations("matcher");
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(form: FormData) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/v1/matcher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form), locale }) });
      if (!r.ok) throw new Error(String(r.status));
      setRes(await r.json());
    } catch { setErr(t("error")); } finally { setBusy(false); }
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
      <form action={submit} className="card h-fit space-y-4 p-6">
        {(Object.keys(options) as (keyof typeof options)[]).map((k) => (
          <label key={k} className="grid gap-1">
            <span className="text-sand-300">{t(k)}</span>
            <select name={k} className="min-h-11"><option value="">{t("anyOption")}</option>{options[k].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
          </label>
        ))}
        <button className="btn btn-gold w-full" disabled={busy}><Icon name="spark" />{busy ? t("working") : t("submit")}</button>
        <p className="text-xs text-sand-400">{t("disclaimer")}</p>
      </form>
      <section aria-live="polite" aria-busy={busy}>
        {err && <p role="alert" className="card p-4 text-gold-300">{err}</p>}
        {res && (
          <>
            <h2 className="mb-2 text-2xl">{t("results")}</h2>
            <p className="mb-4 text-sm text-sand-400">{res.mode === "ai" ? t("modeAi") : t("modeRules")}</p>
            {res.results.length === 0 ? <p className="card p-6">{t("none")}</p> : (
              <ol className="space-y-3">
                {res.results.map((r, i) => products[r.id] && (
                  <li key={r.id} className="card relative flex gap-4 p-5">
                    <span aria-hidden="true" className="font-display text-3xl text-gold-600">{i + 1}</span>
                    <div>
                      <Link href={products[r.id].href} className="text-xl no-underline after:absolute after:inset-0">{products[r.id].name}</Link>
                      <p className="text-sm text-sand-300">{products[r.id].house}</p>
                      <p className="mt-2">{r.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>
    </div>
  );
}
