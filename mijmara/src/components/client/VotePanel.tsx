"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Opt = { id: string; label: string };
type Summary = { votes: number; strength: number | null; longevity: number | null; sillage: number | null; seasons: Record<string, number> };
export const MIN_VOTES = 5;

export function VotePanel({ productId, scales, seasons }: { productId: string; scales: Record<"strength" | "longevity" | "sillage", Opt[]>; seasons: Opt[] }) {
  const t = useTranslations("product");
  const c = useTranslations("common");
  const sb = getBrowserSupabase();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [mine, setMine] = useState<{ strength?: number; longevity?: number; sillage?: number; seasons: string[] }>({ seasons: [] });
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!sb) return;
    sb.from("vote_summary").select("*").eq("product_id", productId).maybeSingle().then(({ data }) => {
      if (data) setSummary({ votes: data.votes, strength: data.strength, longevity: data.longevity, sillage: data.sillage, seasons: data.seasons ?? {} });
    });
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: v } = await sb.from("votes").select("*").eq("product_id", productId).eq("user_id", data.user.id).maybeSingle();
      if (v) setMine({ strength: v.strength ?? undefined, longevity: v.longevity ?? undefined, sillage: v.sillage ?? undefined, seasons: v.seasons ?? [] });
    });
  }, [sb, productId]);

  async function save() {
    if (!sb) return setStatus(c("communityOff"));
    const { data } = await sb.auth.getUser();
    if (!data.user) return setStatus(c("signInToContinue"));
    const { error } = await sb.from("votes").upsert({ user_id: data.user.id, product_id: productId, ...mine });
    setStatus(error ? error.message : t("voteSaved"));
  }

  const count = summary?.votes ?? 0;
  const enough = count >= MIN_VOTES;
  return (
    <div className="space-y-5">
      <p className="text-sm text-sand-300">{t("votes", { count })}{!enough && ` — ${t("minVotes", { min: MIN_VOTES })}`}</p>
      {(["strength", "longevity", "sillage"] as const).map((k) => {
        const avg = enough ? summary?.[k] ?? null : null;
        return (
          <fieldset key={k} className="space-y-2">
            <legend className="font-medium text-gold-300">{t(k)}</legend>
            {avg !== null && (
              <div className="flex items-center gap-3" aria-label={`${t(k)}: ${avg.toFixed(1)} / 5`}>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-oud-700"><div className="h-full rounded-full bg-gold-500" style={{ inlineSize: `${(avg / 5) * 100}%` }} /></div>
                <span className="text-sm">{scales[k][Math.round(avg) - 1]?.label}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${t("yourVote")}: ${t(k)}`}>
              {scales[k].map((o) => (
                <button type="button" role="radio" aria-checked={mine[k] === Number(o.id)} key={o.id} onClick={() => setMine({ ...mine, [k]: Number(o.id) })}
                  className={`chip min-h-9 cursor-pointer ${mine[k] === Number(o.id) ? "!border-gold-500 !bg-gold-500 !text-ink" : ""}`}>{o.label}</button>
              ))}
            </div>
          </fieldset>
        );
      })}
      <fieldset className="space-y-2">
        <legend className="font-medium text-gold-300">{t("seasonVote")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {seasons.map((s) => {
            const on = mine.seasons.includes(s.id);
            const n = enough ? summary?.seasons?.[s.id] ?? 0 : null;
            return (
              <button type="button" aria-pressed={on} key={s.id} onClick={() => setMine({ ...mine, seasons: on ? mine.seasons.filter((x) => x !== s.id) : [...mine.seasons, s.id] })}
                className={`chip min-h-9 cursor-pointer ${on ? "!border-gold-500 !bg-gold-500 !text-ink" : ""}`}>{s.label}{n !== null ? ` · ${n}` : ""}</button>
            );
          })}
        </div>
      </fieldset>
      <button type="button" onClick={save} className="btn btn-gold">{t("submitVote")}</button>
      {status && <p role="status" className="text-sm text-sand-300">{status}</p>}
    </div>
  );
}
