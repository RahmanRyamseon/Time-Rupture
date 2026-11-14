import { getLocale, getTranslations } from "next-intl/server";
import type { Footnotes } from "@/lib/citations";
import { formatDate } from "@/lib/i18n-content";

export async function References({ footnotes }: { footnotes: Footnotes }) {
  if (footnotes.list.length === 0) return null;
  const t = await getTranslations("wiki");
  const locale = await getLocale();
  return (
    <section aria-labelledby="references" className="mt-12 border-t border-line pt-6">
      <h2 id="references" className="text-xl">
        {t("references")}
      </h2>
      <ol className="mt-4 space-y-2 text-sm">
        {footnotes.list.map((c, i) => (
          <li key={c.id} id={`ref-${i + 1}`} className="flex gap-2 target:rounded target:bg-gold-soft/60">
            <span className="w-7 shrink-0 tabular-nums text-muted">{i + 1}.</span>
            <span>
              <a href={c.url} rel="nofollow noopener" target="_blank" className="font-medium">
                {c.title}
              </a>
              {c.publisher ? <span className="text-muted">, {c.publisher}</span> : null}
              <span className="text-muted"> ({t("accessed", { date: formatDate(c.accessed_at, locale) })})</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
