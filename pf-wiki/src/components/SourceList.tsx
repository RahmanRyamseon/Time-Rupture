import type { Source } from "@/lib/types";

export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {sources.map((s) => (
        <li key={s.url} className="text-sm">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-strong underline decoration-brand-strong/40 underline-offset-2 hover:decoration-brand-strong"
          >
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
