import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/types";
import { href } from "@/lib/paths";

/** Assigns stable footnote numbers to the citations used on a page. */
export class CiteRegistry {
  order = new Map<string, number>();
  use(ids: string[] = []): number[] {
    return ids.map((id) => {
      if (!this.order.has(id)) this.order.set(id, this.order.size + 1);
      return this.order.get(id)!;
    });
  }
  list(): string[] { return [...this.order.keys()]; }
}

export function CiteMarks({ nums }: { nums: number[] }) {
  if (!nums.length) return null;
  return <>{nums.map((n) => <sup key={n}><a href={`#cite-${n}`} className="no-underline" aria-label={`[${n}]`}>[{n}]</a></sup>)}</>;
}

/** Undocumented placeholder with a link to contribute. */
export async function Undocumented({ locale, editHref }: { locale: Locale; editHref?: string }) {
  const t = await getTranslations({ locale, namespace: "common" });
  const [a, b] = t("undocumented").split("—").map((s) => s.trim());
  return (
    <span className="undocumented">
      {a}{b ? <> — <Link prefetch={false} href={editHref ?? href(locale, "/contribute")}>{b}</Link></> : null}
    </span>
  );
}

/**
 * Renders a field value with its citation marks, a placeholder if empty, or a "citation needed" tag.
 * `nums` must be computed synchronously in the page (reg.use) so the Sources list is complete.
 */
export async function CitedValue({
  value, nums, locale, editHref, children,
}: {
  value: string | number | null | undefined | boolean;
  nums: number[];
  locale: Locale;
  editHref?: string;
  children?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "common" });
  const empty = value === null || value === undefined || value === "" || value === false;
  if (empty) return <Undocumented locale={locale} editHref={editHref} />;
  return (
    <>
      {children ?? String(value)}
      <CiteMarks nums={nums} />
      {nums.length === 0 && <span className="ms-2 text-xs text-gold-300">[{t("needsCitation")}]</span>}
    </>
  );
}
