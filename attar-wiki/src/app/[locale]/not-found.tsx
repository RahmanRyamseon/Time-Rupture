import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SearchBox } from "@/components/layout/SearchBox";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="container-wiki py-16">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-4xl font-semibold">{t("wiki.notFound")}</h1>
        <p className="mt-3 text-muted">{t("wiki.notFoundBody")}</p>
        <div className="mt-6 text-left">
          <SearchBox />
        </div>
        <Link href="/new/attars" className="btn-secondary mt-6">
          {t("wiki.proposePage")}
        </Link>
      </div>
    </div>
  );
}
