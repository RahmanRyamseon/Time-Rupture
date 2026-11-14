import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getContent } from "@/lib/content";
import { href } from "@/lib/paths";
import { pageMeta } from "@/lib/seo";
import type { Locale, Origin } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "origins" });
  return pageMeta({ locale, title: t("title"), description: t("intro"), paths: { ar: href("ar", "/oud-origins"), en: href("en", "/oud-origins") } });
}

/** Approximate west→east order across South & South-East Asia, used for the explorer layout. */
const ORDER = ["sri-lankan", "hindi", "thai", "laotian", "cambodi", "vietnamese", "malaysian", "indonesian"];

function completeness(o: Origin) {
  const fields = [o.profile, o.smell, o.grading, o.uses];
  return fields.filter((f) => f.ar || f.en).length / fields.length;
}

export default async function OriginsExplorer({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = await getContent();
  const t = await getTranslations({ locale, namespace: "origins" });
  const origins = [...c.origins].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {origins.map((o, i) => {
          const count = c.products.filter((p) => p.origins.includes(o.id)).length;
          const done = completeness(o);
          return (
            <li key={o.id} className="card relative flex flex-col gap-3 p-6">
              <span aria-hidden="true" className="font-display text-4xl text-oud-600">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="text-2xl"><Link prefetch={false} className="no-underline after:absolute after:inset-0" href={href(locale, "/oud-origins/[slug]", { slug: o.slug[locale] })}>{o.name[locale]}</Link></h2>
              <p className="text-sm text-sand-300">{o.region[locale]}</p>
              {o.smell[locale] && <p className="line-clamp-3 text-sm">{o.smell[locale]}</p>}
              <div className="mt-auto flex items-center justify-between pt-2 text-xs text-sand-400">
                <span>{count} {locale === "ar" ? "منتج" : "products"}</span>
                <span className="chip !text-xs">{done >= 0.5 ? t("documented") : t("partial")}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
