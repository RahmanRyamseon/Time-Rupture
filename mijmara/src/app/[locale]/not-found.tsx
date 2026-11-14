import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { href } from "@/lib/paths";
import type { Locale } from "@/lib/types";

export default async function NotFound() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("notFound");
  return (
    <div className="py-20 text-center">
      <h1 className="mb-4 text-4xl">{t("title")}</h1>
      <p className="mb-8 text-sand-300">{t("text")}</p>
      <Link prefetch={false} className="btn btn-gold" href={href(locale, "/")}>{t("home")}</Link>
    </div>
  );
}
