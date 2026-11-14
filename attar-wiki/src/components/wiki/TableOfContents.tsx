import { getTranslations } from "next-intl/server";

export interface TocItem {
  id: string;
  text: string;
  level?: 2 | 3;
}

export async function TableOfContents({ items }: { items: TocItem[] }) {
  if (items.length < 3) return null;
  const t = await getTranslations("wiki");
  return (
    <nav aria-labelledby="toc-title" className="rounded-xl border border-line bg-white/60 p-4 text-sm">
      <p id="toc-title" className="eyebrow mb-2">
        {t("contents")}
      </p>
      <ol className="space-y-1">
        {items.map((item, i) => (
          <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
            <a href={`#${item.id}`} className="block py-0.5 text-bark no-underline hover:text-amber hover:underline">
              {item.level === 3 ? null : <span className="mr-2 tabular-nums text-muted">{i + 1}</span>}
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
