import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getModerator } from "@/lib/moderation";
import { Forbidden, ModShell } from "@/components/moderate/ModShell";
import { ModAction } from "@/components/moderate/ModAction";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users & roles", robots: { index: false } };

export default async function UsersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const mod = await getModerator("admin");
  if (!mod) return <Forbidden />;
  const { q } = await searchParams;
  const t = await getTranslations();
  let query = mod.supabase.from("profiles").select("id, display_name, role, city, created_at").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.ilike("display_name", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await query;
  return (
    <ModShell title={t("moderate.users")}>
      <form method="get" className="mb-6 flex max-w-md gap-2">
        <input name="q" defaultValue={q} className="input" aria-label={t("account.displayName")} placeholder={t("account.displayName")} />
        <button className="btn-secondary" type="submit">
          {t("nav.search")}
        </button>
      </form>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white/70">
        {(data ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{p.display_name}</p>
              <p className="text-sm text-muted">
                {p.role}
                {p.city ? ` · ${p.city}` : ""}
              </p>
            </div>
            {p.id !== mod.user.id ? (
              <div className="flex gap-2">
                {(["contributor", "editor", "admin"] as const)
                  .filter((r) => r !== p.role)
                  .map((r) => (
                    <ModAction key={r} url={`/api/v1/moderation/users/${p.id}`} body={{ role: r }} label={`→ ${r}`} />
                  ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </ModShell>
  );
}
