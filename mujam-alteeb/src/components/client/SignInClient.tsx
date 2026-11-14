"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { communityEnabled, loadSupabase, useSupabase } from "@/lib/supabase/browser";

export function SignInClient({ redirectPath }: { redirectPath: string }) {
  const t = useTranslations("auth");
  const c = useTranslations("common");
  const sb = useSupabase();
  const [msg, setMsg] = useState("");
  if (!communityEnabled) return <p className="card max-w-xl p-6 text-sand-300">{c("communityOff")}</p>;
  if (!sb) return <p>{c("loading")}</p>;
  const redirectTo = typeof window !== "undefined" ? window.location.origin + encodeURI(redirectPath) : undefined;
  return (
    <div className="card max-w-md space-y-4 p-6">
      <form action={async (f) => {
        const { error } = await sb.auth.signInWithOtp({ email: String(f.get("email")), options: { emailRedirectTo: redirectTo } });
        setMsg(error ? error.message : t("sent"));
      }} className="grid gap-3">
        <label className="grid gap-1"><span>{t("email")}</span><input type="email" name="email" required autoComplete="email" inputMode="email" dir="ltr" /></label>
        <button className="btn btn-gold">{t("send")}</button>
      </form>
      <button type="button" className="btn btn-ghost w-full" onClick={() => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })}>{t("google")}</button>
      {msg && <p role="status" className="text-sm text-sand-300">{msg}</p>}
    </div>
  );
}
