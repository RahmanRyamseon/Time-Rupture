import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { AppPathname } from "@/i18n/routing";
import { href } from "./paths";
import { pageMeta } from "./seo";
import type { Locale } from "./types";

/** Metadata for utility pages whose title/intro come from a messages namespace. */
export async function simpleMeta(locale: Locale, route: AppPathname, ns: string, titleKey = "title", introKey = "intro", noindex = true): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: ns });
  return pageMeta({ locale, title: t(titleKey), description: t.has(introKey) ? t(introKey) : t(titleKey), paths: { ar: href("ar", route), en: href("en", route) }, noindex });
}
