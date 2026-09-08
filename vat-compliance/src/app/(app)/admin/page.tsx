import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return (
      <section style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted)" }}>
        You don&apos;t have admin access to this workpaper.
      </section>
    );
  }

  // RLS's "admin can read all" policy is what actually makes this query
  // return every user's workpapers — there is no service-role bypass here.
  const { data: workpapers, error } = await supabase
    .from("workpapers")
    .select("id, period_label, currency, created_at, owner_id")
    .order("created_at", { ascending: false });

  const ownerIds = Array.from(new Set((workpapers ?? []).map((w) => w.owner_id)));
  const { data: profiles } = ownerIds.length
    ? await supabase.from("profiles").select("id, email").in("id", ownerIds)
    : { data: [] as { id: string; email: string }[] };
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  return (
    <section style={{ padding: "20px 24px", maxWidth: 1080 }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Admin — All Workpapers</div>
      <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 3, marginBottom: 16 }}>
        Every saved workpaper across all users, visible to your account because Row Level Security grants admin accounts a
        read-all policy on <code>workpapers</code> (see supabase/migrations/0001_init.sql). Regular accounts cannot see this page
        or query these rows.
      </div>

      {error && (
        <div style={{ background: "var(--danger-soft)", color: "var(--danger)", borderRadius: 6, padding: "10px 14px", fontSize: 12 }}>
          Could not load workpapers: {error.message}
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11.5 }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)", color: "var(--muted)", textAlign: "left" }}>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Owner</th>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Period</th>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Currency</th>
              <th style={{ padding: "9px 12px", fontWeight: 600, borderBottom: "1px solid #dfe2e6" }}>Saved</th>
            </tr>
          </thead>
          <tbody>
            {(workpapers ?? []).map((w) => (
              <tr key={w.id}>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #eef0f2" }}>{emailById.get(w.owner_id) ?? w.owner_id}</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #eef0f2", fontFamily: "var(--font-mono)" }}>{w.period_label}</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #eef0f2", fontFamily: "var(--font-mono)" }}>{w.currency}</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #eef0f2", fontFamily: "var(--font-mono)" }}>{new Date(w.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(workpapers ?? []).length === 0 && !error && (
          <div style={{ padding: 30, textAlign: "center", color: "var(--muted-soft)", fontSize: 12 }}>No workpapers saved yet.</div>
        )}
      </div>
    </section>
  );
}
