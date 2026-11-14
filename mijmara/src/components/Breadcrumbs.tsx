import Link from "next/link";
import { Icon } from "./Icon";

export function Breadcrumbs({ items, label }: { items: { label: string; href?: string }[]; label: string }) {
  return (
    <nav aria-label={label} className="mb-4 text-sm text-sand-300">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <Icon name="chevron" className="h-3.5 w-3.5 ltr:rotate-180" />}
            {it.href ? <Link href={it.href} className="text-sand-300 hover:text-gold-300">{it.label}</Link> : <span aria-current="page" className="text-sand-100">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
