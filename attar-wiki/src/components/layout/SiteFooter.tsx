import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE_NAME } from "@/lib/site";

export async function SiteFooter() {
  const t = await getTranslations();
  return (
    <footer className="mt-20 border-t border-line bg-bark text-sand">
      <div className="container-wiki grid gap-8 py-10 pb-28 md:grid-cols-3 md:pb-10">
        <div className="md:col-span-2">
          <p className="font-display text-lg text-gold-soft">{SITE_NAME}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed">{t("footer.independent", { name: SITE_NAME })}</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed">
            <strong className="text-gold-soft">⚠ </strong>
            {t("footer.patch")}
          </p>
          <p className="mt-3 max-w-2xl text-xs text-sand/80">{t("footer.content")}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["/attars", t("nav.attars")],
              ["/notes", t("nav.notes")],
              ["/houses", t("nav.houses")],
              ["/regions", t("nav.regions")],
              ["/glossary", t("nav.glossary")],
              ["/guides", t("nav.guides")],
              ["/compare", t("nav.compare")],
              ["/contribute", t("nav.contribute")],
              ["/about", t("nav.about")],
              ["/privacy", t("footer.privacy")],
              ["/terms", t("footer.terms")],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-sand underline decoration-gold/40 hover:text-white">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
