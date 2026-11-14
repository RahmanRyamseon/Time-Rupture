"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getBrowserClient, supabaseConfigured } from "@/lib/supabase/client";

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!supabaseConfigured()) return <p className="mt-6 text-sm text-danger">{t("unavailable")}</p>;

  const next = locale === "en" ? "/" : `/${locale}`;
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  return (
    <div className="mt-6 space-y-6">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setState("sending");
          const supabase = await getBrowserClient();
          const res = await supabase?.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
          setState(!res || res.error ? "error" : "sent");
        }}
        className="space-y-3"
      >
        <div>
          <label htmlFor="email" className="label">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={state === "sending"}>
          {t("send")}
        </button>
        <p role="status" className="text-sm">
          {state === "sent" ? <span className="text-ok">{t("sent")}</span> : null}
          {state === "error" ? <span className="text-danger">{t("error")}</span> : null}
        </p>
      </form>
      {googleEnabled ? (
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={async () => {
            const supabase = await getBrowserClient();
            await supabase?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
          }}
        >
          {t("google")}
        </button>
      ) : null}
    </div>
  );
}
