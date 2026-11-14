import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getModerator } from "@/lib/moderation";
import { Forbidden, ModShell } from "@/components/moderate/ModShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

export default async function ModeratePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const mod = await getModerator();
  if (!mod) return <Forbidden />;
  const t = await getTranslations("moderate");
  const [edits, reviews, media, gaps] = await Promise.all([
    mod.supabase.from("edit_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    mod.supabase.from("reviews").select("id", { count: "exact", head: true }).or("status.eq.pending,status.eq.hidden,report_count.gt.0"),
    mod.supabase.from("media").select("id", { count: "exact", head: true }).eq("status", "pending"),
    mod.supabase.rpc("citation_gaps", { p_limit: 500 }),
  ]);
  const cards = [
    ["/moderate/edits", t("pendingEdits"), edits.count ?? 0],
    ["/moderate/reviews", t("flaggedReviews"), reviews.count ?? 0],
    ["/moderate/media", t("pendingMedia"), media.count ?? 0],
    ["/moderate/citations", t("citationGaps"), (gaps.data as unknown[] | null)?.length ?? 0],
    ["/moderate/gaps", t("dataGaps"), "→"],
  ] as const;
  return (
    <ModShell title={t("title")}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([href, label, n]) => (
          <li key={href}>
            <Link href={href} className="card block p-5 no-underline hover:shadow-md">
              <span className="font-display text-4xl font-semibold text-bark">{n}</span>
              <span className="mt-1 block text-sm text-muted">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ModShell>
  );
}
