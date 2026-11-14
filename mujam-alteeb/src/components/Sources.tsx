import { getTranslations } from "next-intl/server";
import type { Citation, Locale } from "@/lib/types";
import { formatDate } from "@/lib/format";

export async function Sources({ ids, citations, locale }: { ids: string[]; citations: Record<string, Citation>; locale: Locale }) {
  if (!ids.length) return null;
  const t = await getTranslations({ locale, namespace: "common" });
  return (
    <section aria-labelledby="sources-h" className="mt-12">
      <hr className="divider mb-6" />
      <h2 id="sources-h" className="mb-4 text-2xl">{t("sources")}</h2>
      <ol className="space-y-3 text-sm">
        {ids.map((id, i) => {
          const c = citations[id];
          if (!c) return null;
          return (
            <li key={id} id={`cite-${i + 1}`} className="scroll-mt-24">
              <span className="text-gold-400">[{i + 1}]</span>{" "}
              <a href={c.url} rel="noopener noreferrer" target="_blank" lang="en" dir="ltr" className="break-words">{c.title}</a>
              <span className="text-sand-300"> — {c.publisher}. {t("accessed")}: {formatDate(c.accessed, locale)}</span>
              {c.quote && <blockquote lang="en" dir="ltr" className="mt-1 border-s-2 border-oud-600 ps-3 text-start text-sand-400">“{c.quote}”</blockquote>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
