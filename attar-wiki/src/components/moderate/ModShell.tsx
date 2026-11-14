import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function ModShell({ title, children }: { title: string; children: ReactNode }) {
  const t = await getTranslations("moderate");
  const links = [
    ["/moderate", t("title")],
    ["/moderate/edits", t("pendingEdits")],
    ["/moderate/reviews", t("flaggedReviews")],
    ["/moderate/media", t("pendingMedia")],
    ["/moderate/citations", t("citationGaps")],
    ["/moderate/gaps", t("dataGaps")],
    ["/moderate/users", t("users")],
  ] as const;
  return (
    <div className="container-wiki py-10">
      <nav aria-label={t("title")} className="mb-6 flex flex-wrap gap-2 text-sm">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="chip">
            {label}
          </Link>
        ))}
      </nav>
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export async function Forbidden() {
  const t = await getTranslations();
  return (
    <div className="container-wiki py-16">
      <p className="text-lg">{t("moderate.forbidden")}</p>
      <Link href="/sign-in" className="mt-4 inline-block">
        {t("nav.signIn")}
      </Link>
    </div>
  );
}
