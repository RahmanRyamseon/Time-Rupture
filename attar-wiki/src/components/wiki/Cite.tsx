import { getTranslations } from "next-intl/server";
import type { Footnotes } from "@/lib/citations";

/** Superscript footnote links for a field, or a "needs citation" flag. */
export async function Cite({ field, footnotes, missing }: { field: string; footnotes: Footnotes; missing: string[] }) {
  const nums = footnotes.byField[field];
  if (nums?.length) {
    return (
      <sup className="ml-0.5 whitespace-nowrap text-xs">
        {nums.map((n) => (
          <a key={n} href={`#ref-${n}`} id={`cite-${field}-${n}`} className="px-0.5 no-underline hover:underline" aria-label={`Reference ${n}`}>
            [{n}]
          </a>
        ))}
      </sup>
    );
  }
  if (missing.includes(field)) {
    const t = await getTranslations("wiki");
    return (
      <sup className="ml-1 whitespace-nowrap text-xs italic text-danger" title={t("needsCitationTitle")}>
        [{t("needsCitation")}]
      </sup>
    );
  }
  return null;
}
