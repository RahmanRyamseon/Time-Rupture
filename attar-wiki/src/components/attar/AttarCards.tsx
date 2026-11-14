import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AttarCard } from "@/lib/types";

export async function AttarCards({ attars, headingLevel = 3 }: { attars: AttarCard[]; headingLevel?: 2 | 3 }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {attars.map((a) => (
        <li key={a.id} className="card group relative p-4 transition-shadow hover:shadow-md">
          <H className="text-lg font-semibold leading-snug">
            <Link href={`/attars/${a.slug}`} className="text-bark no-underline after:absolute after:inset-0 group-hover:text-amber">
              {locale === "hi" && a.name_hi ? a.name_hi : a.name}
            </Link>
          </H>
          {a.house ? <p className="text-sm text-muted">{t("attar.madeBy", { house: a.house.name })}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {a.attar_type ? <span className="rounded-full bg-sand px-2 py-0.5 text-cocoa">{t(`attarType.${a.attar_type}`)}</span> : null}
            {a.scent_family ? <span className="rounded-full bg-sand px-2 py-0.5 text-cocoa">{a.scent_family}</span> : null}
          </div>
          {a.summary ? <p className="mt-2 line-clamp-2 text-sm text-ink/80">{a.summary}</p> : null}
        </li>
      ))}
    </ul>
  );
}
