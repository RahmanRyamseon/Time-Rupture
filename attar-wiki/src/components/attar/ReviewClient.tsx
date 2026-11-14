"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { CLIMATES, SKIN_TYPES, type Review } from "@/lib/types";

export function ReviewForm({ attarId }: { attarId: string }) {
  const t = useTranslations();
  const { user, enabled } = useAuth();
  const [existing, setExisting] = useState<Review | null>(null);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [skin, setSkin] = useState("");
  const [climate, setClimate] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/v1/reviews?attar=${attarId}&mine=1`)
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((b: { reviews: Review[] }) => {
        const mine = b.reviews[0];
        if (mine) {
          setExisting(mine);
          setBody(mine.body);
          setSkin(mine.skin_type ?? "");
          setClimate(mine.climate ?? "");
          setCity(mine.city ?? "");
        }
      })
      .catch(() => {});
  }, [user, attarId]);

  if (!enabled) return null;
  if (!user) {
    return (
      <Link href="/sign-in" className="btn-secondary">
        {t("reviews.signIn")}
      </Link>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage(null);
    const res = await fetch("/api/v1/reviews", {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attarId, body, skinType: skin || null, climate: climate || null, city: city || null }),
    }).catch(() => null);
    if (!res?.ok) {
      const err = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
      setStatus("error");
      setMessage(err.error ?? t("common.error"));
      return;
    }
    const saved = (await res.json()) as { review: Review };
    setExisting(saved.review);
    setStatus("done");
    setOpen(false);
    setMessage(saved.review.status === "pending" ? t("reviews.pending") : null);
  }

  async function remove() {
    if (!existing) return;
    const res = await fetch(`/api/v1/reviews?id=${existing.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setExisting(null);
      setBody("");
      setOpen(false);
    }
  }

  return (
    <div>
      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
            {existing ? t("reviews.edit") : t("reviews.write")}
          </button>
          {message ? <p className="text-sm text-muted">{message}</p> : null}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-4">
          <div>
            <label htmlFor="review-body" className="label">
              {t("reviews.body")}
            </label>
            <textarea
              id="review-body"
              className="input min-h-32"
              required
              minLength={20}
              maxLength={1500}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-describedby="review-help"
            />
            <p id="review-help" className="help">
              {t("reviews.bodyHelp")} ({body.length}/1500)
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="review-skin" className="label">
                {t("reviews.skin")}
              </label>
              <select id="review-skin" className="input" value={skin} onChange={(e) => setSkin(e.target.value)}>
                <option value="">—</option>
                {SKIN_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {t(`skin.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="review-climate" className="label">
                {t("reviews.climate")}
              </label>
              <select id="review-climate" className="input" value={climate} onChange={(e) => setClimate(e.target.value)}>
                <option value="">—</option>
                {CLIMATES.map((c) => (
                  <option key={c} value={c}>
                    {t(`climate.${c}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="review-city" className="label">
                {t("reviews.city")}
              </label>
              <input id="review-city" className="input" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          {message ? (
            <p role="alert" className="text-sm text-danger">
              {message}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={status === "saving"}>
              {existing ? t("reviews.update") : t("reviews.submit")}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </button>
            {existing ? (
              <button type="button" className="btn-ghost ml-auto text-danger" onClick={remove}>
                {t("reviews.delete")}
              </button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}

const REASONS = ["spam", "abuse", "off_topic", "copied_text", "commercial", "other"] as const;

export function ReportButton({ reviewId, authorId }: { reviewId: string; authorId: string }) {
  const t = useTranslations();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  if (!user || user.id === authorId) return null;
  if (done) return <span className="text-xs text-muted">{t("reviews.reported")}</span>;
  if (!open) {
    return (
      <button type="button" className="text-xs text-muted underline" onClick={() => setOpen(true)}>
        {t("reviews.report")}
      </button>
    );
  }
  return (
    <form
      className="inline-flex flex-wrap items-center justify-end gap-2 text-xs"
      onSubmit={async (e) => {
        e.preventDefault();
        const reason = new FormData(e.currentTarget).get("reason");
        const res = await fetch(`/api/v1/reviews/${reviewId}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }).catch(() => null);
        if (res?.ok || res?.status === 409) setDone(true);
      }}
    >
      <label htmlFor={`reason-${reviewId}`}>{t("reviews.reportReason")}</label>
      <select id={`reason-${reviewId}`} name="reason" className="rounded border border-line bg-white px-2 py-1">
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {t(`reportReason.${r}`)}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded-full bg-bark px-3 py-1 text-white">
        {t("reviews.report")}
      </button>
    </form>
  );
}
