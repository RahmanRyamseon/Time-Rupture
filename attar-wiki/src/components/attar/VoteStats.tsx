import { getTranslations } from "next-intl/server";
import type { VoteMetric, VoteStat } from "@/lib/types";

const EARLY = 3;

/** Averages + counts + distribution. Never a single editorial score. */
export async function VoteStats({ stats, metrics }: { stats: VoteStat[]; metrics: VoteMetric[] }) {
  const t = await getTranslations();
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {metrics.map((m) => {
        const s = stats.find((x) => x.metric === m);
        const count = s?.vote_count ?? 0;
        const avg = s?.vote_avg != null ? Number(s.vote_avg) : null;
        const scale = (t.raw(`scale.${m === "longevity" ? "longevity" : m === "sillage" ? "sillage" : "weather"}`) as string[]) ?? [];
        const max = Math.max(1, ...(s?.distribution ?? [0]));
        return (
          <div key={m} className="rounded-xl border border-line bg-white/70 p-4">
            <dt className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-bark">{t(`metric.${m}`)}</span>
              <span className="text-xs text-muted">
                {t("attar.votes", { count })}
                {count > 0 && count < EARLY ? ` · ${t("attar.earlyData")}` : ""}
              </span>
            </dt>
            <dd className="mt-2">
              {avg == null ? (
                <p className="text-sm italic text-muted">{t("attar.noVotes")}</p>
              ) : (
                <>
                  <p className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-semibold text-bark">{avg.toFixed(1)}</span>
                    <span className="text-sm text-muted">/ 5 · {scale[Math.min(4, Math.max(0, Math.round(avg) - 1))]}</span>
                  </p>
                  <div className="mt-3 grid grid-cols-5 items-end gap-1" aria-label="Vote distribution">
                    {(s?.distribution ?? []).map((n, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="flex h-10 w-full items-end rounded bg-sand">
                          <div className="w-full rounded bg-amber-bright" style={{ height: `${(n / max) * 100}%` }} />
                        </div>
                        <span className="text-[10px] leading-tight text-muted" title={scale[i]}>
                          {i + 1} <span className="sr-only">: {scale[i]}, {n}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
