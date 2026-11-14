import { getLocale, getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/i18n-content";
import type { Review } from "@/lib/types";
import { ReviewForm, ReportButton } from "./ReviewClient";

export async function Reviews({ attarId, reviews }: { attarId: string; reviews: Review[] }) {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <div>
      <ReviewForm attarId={attarId} />
      {reviews.length === 0 ? (
        <p className="mt-6 text-sm italic text-muted">{t("reviews.none")}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-white/70 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-bark">{r.author?.display_name ?? "—"}</p>
                <p className="text-xs text-muted">{formatDate(r.created_at, locale)}</p>
              </div>
              {r.skin_type || r.climate || r.city ? (
                <p className="mt-0.5 text-xs text-muted">
                  {[r.skin_type ? `${t(`skin.${r.skin_type}`)} ${t("reviews.skin").toLowerCase()}` : null, r.climate ? t(`climate.${r.climate}`) : null, r.city]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-line text-[0.97rem] leading-relaxed">{r.body}</p>
              <div className="mt-2 text-right">
                <ReportButton reviewId={r.id} authorId={r.user_id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
