import Link from "next/link";
import type { Content, Locale, Product } from "@/lib/types";
import { href } from "@/lib/paths";
import { taxName } from "@/lib/content";

export function ProductCard({ p, c, locale }: { p: Product; c: Content; locale: Locale }) {
  const house = c.houses.find((h) => h.id === p.houseId);
  const origins = p.origins.map((o) => taxName(c, "origin_group", o, locale));
  return (
    <article className="card group relative flex h-full flex-col gap-2 p-5 transition-colors hover:border-gold-600">
      <p className="text-xs text-gold-400">{taxName(c, "category", p.category, locale)}</p>
      <h3 className="text-xl">
        <Link href={href(locale, "/products/[slug]", { slug: p.slug[locale] })} className="text-gold-300 no-underline after:absolute after:inset-0">
          {p.name[locale]}
        </Link>
      </h3>
      <p className="text-sm text-sand-300">{house?.name[locale]}</p>
      {origins.length > 0 && (
        <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {origins.map((o) => <li key={o} className="chip">{o}</li>)}
        </ul>
      )}
    </article>
  );
}
