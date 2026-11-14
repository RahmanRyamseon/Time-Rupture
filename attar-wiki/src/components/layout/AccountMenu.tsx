"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Icon } from "@/components/ui/Icon";

export function AccountMenu() {
  const t = useTranslations("nav");
  const { user, profile, isEditor, signOut, enabled, loading } = useAuth();
  if (!enabled) return null;
  if (loading) return <span className="inline-block w-16" aria-hidden="true" />;
  if (!user) {
    return (
      <Link href="/sign-in" className="btn-ghost px-3 text-sm">
        {t("signIn")}
      </Link>
    );
  }
  return (
    <details className="relative">
      <summary
        className="btn-ghost cursor-pointer list-none px-3 [&::-webkit-details-marker]:hidden"
        aria-label={t("account")}
      >
        <Icon name="user" />
      </summary>
      <div className="card absolute right-0 top-12 z-50 w-56 p-2 text-sm">
        <p className="truncate px-3 py-2 font-semibold text-bark">{profile?.display_name ?? user.email}</p>
        <Link href="/account" className="block rounded-lg px-3 py-2.5 text-bark no-underline hover:bg-sand">
          {t("account")}
        </Link>
        <Link href="/shelf" className="block rounded-lg px-3 py-2.5 text-bark no-underline hover:bg-sand">
          {t("shelf")}
        </Link>
        {isEditor ? (
          <Link href="/moderate" className="block rounded-lg px-3 py-2.5 text-bark no-underline hover:bg-sand">
            {t("moderate")}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => void signOut()}
          className="block w-full rounded-lg px-3 py-2.5 text-left text-bark hover:bg-sand"
        >
          {t("signOut")}
        </button>
      </div>
    </details>
  );
}
