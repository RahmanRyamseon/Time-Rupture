"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

interface MyEdit {
  id: string;
  entity_type: string;
  summary: string;
  status: string;
  created_at: string;
  review_note: string | null;
}

export function AccountView() {
  const t = useTranslations();
  const locale = useLocale();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [edits, setEdits] = useState<MyEdit[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/v1/edits?mine=1")
      .then((r) => (r.ok ? r.json() : { edits: [] }))
      .then((b: { edits: MyEdit[] }) => setEdits(b.edits))
      .catch(() => {});
  }, [user]);

  if (loading) return <p className="mt-6 text-muted">{t("common.loading")}</p>;
  if (!user)
    return (
      <p className="mt-6">
        <Link href="/sign-in">{t("nav.signIn")}</Link>
      </p>
    );

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-2">
      <ProfileForm key={profile?.id ?? "none"} email={user.email ?? ""} profile={profile} onSaved={refreshProfile} />

      <section aria-labelledby="my-edits">
        <h2 id="my-edits" className="text-2xl font-semibold">
          {t("account.myEdits")}
        </h2>
        {edits.length === 0 ? (
          <p className="mt-3 text-muted">{t("account.noEdits")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {edits.map((e) => (
              <li key={e.id} className="py-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{e.summary}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${e.status === "approved" ? "bg-ok/10 text-ok" : e.status === "rejected" ? "bg-danger/10 text-danger" : "bg-sand"}`}>
                    {e.status}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {t(`types.${e.entity_type}`)} · {new Date(e.created_at).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN")}
                </p>
                {e.review_note ? <p className="mt-1 text-xs italic text-muted">“{e.review_note}”</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProfileForm({
  email,
  profile,
  onSaved,
}: {
  email: string;
  profile: { display_name: string; city: string | null; role: string } | null;
  onSaved: () => Promise<void>;
}) {
  const t = useTranslations();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [saved, setSaved] = useState(false);
  return (
      <form
        className="card space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/v1/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName: name, city: city || null }),
          });
          if (res.ok) {
            setSaved(true);
            await onSaved();
          }
        }}
      >
        <p className="text-sm text-muted">{email}</p>
        {profile ? <p className="text-sm">{t("account.role", { role: profile.role })}</p> : null}
        <div>
          <label htmlFor="dn" className="label">
            {t("account.displayName")}
          </label>
          <input id="dn" className="input" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="city" className="label">
            {t("account.city")}
          </label>
          <input id="city" className="input" maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" type="submit">
            {t("account.save")}
          </button>
          {saved ? <span role="status" className="text-sm text-ok">{t("account.saved")}</span> : null}
        </div>
      </form>
  );
}
