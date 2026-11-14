"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { VOTE_METRICS, type VoteMetric } from "@/lib/types";

export function VotePanel({ attarId }: { attarId: string }) {
  const t = useTranslations();
  const { user, enabled } = useAuth();
  const [mine, setMine] = useState<Partial<Record<VoteMetric, number>>>({});
  const [busy, setBusy] = useState<VoteMetric | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/v1/votes?attar=${attarId}`)
      .then((r) => (r.ok ? r.json() : { votes: [] }))
      .then((b: { votes: { metric: VoteMetric; value: number }[] }) =>
        setMine(Object.fromEntries(b.votes.map((v) => [v.metric, v.value]))),
      )
      .catch(() => {});
  }, [user, attarId]);

  if (!enabled) return null;
  if (!user) {
    return (
      <p className="text-sm">
        <Link href="/sign-in">{t("attar.signInToVote")}</Link>
      </p>
    );
  }

  async function vote(metric: VoteMetric, value: number | null) {
    setBusy(metric);
    setError(null);
    const prev = mine[metric];
    setMine((m) => ({ ...m, [metric]: value ?? undefined }));
    const res = await fetch("/api/v1/votes", {
      method: value == null ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attarId, metric, value }),
    }).catch(() => null);
    if (!res?.ok) {
      setMine((m) => ({ ...m, [metric]: prev }));
      setError(t("common.error"));
    }
    setBusy(null);
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-sand/40 p-4">
      <p className="font-semibold text-bark">{t("attar.yourVote")}</p>
      <div className="mt-3 space-y-3">
        {VOTE_METRICS.map((m) => {
          const scale = t.raw(`scale.${m === "longevity" ? "longevity" : m === "sillage" ? "sillage" : "weather"}`) as string[];
          return (
            <fieldset key={m} className="flex flex-wrap items-center gap-2" disabled={busy === m}>
              <legend className="w-full text-sm font-medium text-bark sm:w-40">{t(`metric.${m}`)}</legend>
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={mine[m] === v}
                  title={scale[v - 1]}
                  aria-label={`${t(`metric.${m}`)}: ${v}, ${scale[v - 1]}`}
                  onClick={() => vote(m, v)}
                  className={`h-10 w-10 rounded-full border text-sm font-semibold ${
                    mine[m] === v ? "border-amber bg-amber text-white" : "border-line bg-white text-bark hover:border-amber"
                  }`}
                >
                  {v}
                </button>
              ))}
              {mine[m] ? (
                <button type="button" className="text-sm text-muted underline" onClick={() => vote(m, null)}>
                  {t("attar.clearVote")}
                </button>
              ) : null}
            </fieldset>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
