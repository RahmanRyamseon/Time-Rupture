"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const OCCASIONS = ["daily", "office", "evening", "wedding", "prayer", "date", "sleep"] as const;
const WEATHERS = ["heat", "humidity", "winter", "any"] as const;
const VIBES = ["fresh", "floral", "earthy", "woody", "spicy", "sweet", "smoky", "green"] as const;
const BUDGETS = ["any", "low", "mid", "high"] as const;

type Reason =
  | { kind: "occasion" }
  | { kind: "weather"; metric: string; avg: number; count: number }
  | { kind: "family"; family: string }
  | { kind: "note"; note: string }
  | { kind: "budget"; min: number; max: number }
  | { kind: "longevity"; avg: number; count: number };

interface Result {
  id: string;
  slug: string;
  name: string;
  house: string | null;
  reasons: Reason[];
}

function Choice({ name, value, label, checked, onChange, type = "radio" }: { name: string; value: string; label: string; checked: boolean; onChange: () => void; type?: "radio" | "checkbox" }) {
  return (
    <label className={`chip min-h-11 cursor-pointer px-4 ${checked ? "border-amber bg-amber text-white hover:border-amber" : ""}`}>
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {label}
    </label>
  )
}

export function Finder() {
  const t = useTranslations();
  const locale = useLocale();
  const [occasion, setOccasion] = useState<string | null>(null);
  const [weather, setWeather] = useState<string>("any");
  const [vibes, setVibes] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>("any");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [results, setResults] = useState<Result[]>([]);
  const [method, setMethod] = useState<"ai" | "rules">("rules");
  const nf = new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN", { maximumFractionDigits: 0 });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/v1/matcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion: occasion ?? undefined, weather, vibes, budget }),
      });
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { method: "ai" | "rules"; results: Result[] };
      setResults(body.results);
      setMethod(body.method);
      setState("done");
    } catch {
      setState("error");
    }
  }

  const reasonText = (r: Reason) => {
    switch (r.kind) {
      case "occasion":
        return t("finder.match.occasion");
      case "weather":
        return t("finder.match.weather", { avg: r.avg.toFixed(1), metric: t(`metric.${r.metric}`), count: t("attar.votes", { count: r.count }) });
      case "family":
        return t("finder.match.family", { family: r.family });
      case "note":
        return t("finder.match.note", { note: r.note });
      case "budget":
        return t("finder.match.budget", { min: nf.format(r.min), max: nf.format(r.max) });
      case "longevity":
        return t("finder.match.longevity", { avg: r.avg.toFixed(1), count: t("attar.votes", { count: r.count }) });
    }
  };

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={submit} className="space-y-8">
        <fieldset>
          <legend className="mb-3 text-xl font-semibold text-bark">1. {t("finder.occasion")}</legend>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <Choice key={o} name="occasion" value={o} label={t(`finder.occasions.${o}`)} checked={occasion === o} onChange={() => setOccasion(occasion === o ? null : o)} type="checkbox" />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-xl font-semibold text-bark">2. {t("finder.weather")}</legend>
          <div className="flex flex-wrap gap-2">
            {WEATHERS.map((w) => (
              <Choice key={w} name="weather" value={w} label={t(`finder.weathers.${w}`)} checked={weather === w} onChange={() => setWeather(w)} />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-xl font-semibold text-bark">3. {t("finder.vibe")}</legend>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <Choice
                key={v}
                name="vibes"
                value={v}
                type="checkbox"
                label={t(`finder.vibes.${v}`)}
                checked={vibes.includes(v)}
                onChange={() => setVibes((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].slice(-3)))}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-base font-semibold text-bark">{t("finder.budget")}</legend>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <Choice key={b} name="budget" value={b} label={t(`finder.budgets.${b}`)} checked={budget === b} onChange={() => setBudget(b)} />
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn-primary min-h-12 px-8 text-base" disabled={state === "loading"}>
          {state === "loading" ? t("finder.loading") : t("finder.go")}
        </button>
      </form>

      <section aria-live="polite" aria-busy={state === "loading"}>
        {state === "error" ? <p className="text-danger">{t("common.error")}</p> : null}
        {state === "done" && results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-sand/50 p-6 text-muted">{t("finder.none")}</p>
        ) : null}
        {results.length > 0 ? (
          <>
            <ol className="space-y-4">
              {results.map((r, i) => (
                <li key={r.id} className="card p-5">
                  <p className="eyebrow">#{i + 1}</p>
                  <Link href={`/attars/${r.slug}`} className="font-display text-2xl font-semibold">
                    {r.name}
                  </Link>
                  {r.house ? <p className="text-sm text-muted">{t("attar.madeBy", { house: r.house })}</p> : null}
                  {r.reasons.length ? (
                    <>
                      <p className="mt-3 text-sm font-semibold text-bark">{t("finder.why")}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                        {r.reasons.map((reason, j) => (
                          <li key={j}>{reasonText(reason)}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted">{method === "ai" ? t("finder.aiNote") : t("finder.ruleNote")}</p>
          </>
        ) : null}
      </section>
    </div>
  );
}
