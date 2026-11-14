import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getModerator } from "@/lib/moderation";
import { Forbidden, ModShell } from "@/components/moderate/ModShell";
import { ModAction } from "@/components/moderate/ModAction";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Flagged reviews", robots: { index: false } };

export default async function ReviewsQueue({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const mod = await getModerator();
  if (!mod) return <Forbidden />;
  const t = await getTranslations();
  const { data } = await mod.supabase
    .from("reviews")
    .select("id, body, status, report_count, created_at, attar:attars(slug, name), reports:review_reports(reason, details, resolved)")
    .or("status.eq.pending,status.eq.hidden,report_count.gt.0")
    .order("report_count", { ascending: false })
    .limit(200);
  const reviews = (data ?? []) as unknown as {
    id: string;
    body: string;
    status: string;
    report_count: number;
    attar: { slug: string; name: string } | null;
    reports: { reason: string; details: string | null; resolved: boolean }[];
  }[];
  return (
    <ModShell title={t("moderate.flaggedReviews")}>
      {reviews.length === 0 ? (
        <p className="text-muted">{t("moderate.nothing")}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="card grid gap-4 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm text-muted">
                  {r.attar ? <Link href={`/attars/${r.attar.slug}`}>{r.attar.name}</Link> : null} · {r.status} ·{" "}
                  {t("moderate.reports", { count: r.report_count })}
                </p>
                <p className="mt-2 whitespace-pre-line">{r.body}</p>
                {r.reports.filter((x) => !x.resolved).length ? (
                  <p className="mt-2 text-xs text-muted">
                    {r.reports
                      .filter((x) => !x.resolved)
                      .map((x) => t(`reportReason.${x.reason}`) + (x.details ? ` (${x.details})` : ""))
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2 md:flex-col">
                <ModAction url={`/api/v1/moderation/reviews/${r.id}`} body={{ status: "published" }} label={t("moderate.publish")} variant="primary" />
                <ModAction url={`/api/v1/moderation/reviews/${r.id}`} body={{ status: "hidden" }} label={t("moderate.hide")} variant="danger" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModShell>
  );
}
