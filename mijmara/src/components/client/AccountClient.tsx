"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function AccountClient({ links }: { links: Record<"collection" | "moderation" | "signIn" | "settings", string> }) {
  const t = useTranslations("auth");
  const n = useTranslations("nav");
  const c = useTranslations("common");
  const sb = getBrowserSupabase();
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string>("contributor");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!sb) return setReady(true);
    sb.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: p } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
        if (p?.role) setRole(p.role);
      }
      setReady(true);
    });
  }, [sb]);
  if (!sb) return <p className="card max-w-xl p-6 text-sand-300">{c("communityOff")}</p>;
  if (!ready) return <p>{c("loading")}</p>;
  if (!email) return <Link className="btn btn-gold" href={links.signIn}>{n("signIn")}</Link>;
  return (
    <div className="card max-w-xl space-y-4 p-6">
      <p dir="ltr" className="text-start">{email}</p>
      <p>{t("role")}: <strong className="text-gold-300">{t(`roles.${role}` as "roles.reader")}</strong></p>
      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-ghost" href={links.collection}>{n("collection")}</Link>
        <Link className="btn btn-ghost" href={links.settings}>{n("settings")}</Link>
        {(role === "editor" || role === "admin") && <Link className="btn btn-ghost" href={links.moderation}>{n("moderation")}</Link>}
        <button className="btn btn-ghost" onClick={async () => { await sb.auth.signOut(); window.location.reload(); }}>{t("signOut")}</button>
      </div>
    </div>
  );
}
