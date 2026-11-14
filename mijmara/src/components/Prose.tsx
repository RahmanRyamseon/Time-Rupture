import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Tiny, safe Markdown renderer for editorial bodies (headings, lists, quotes,
 * bold, links, and {{cite:id}} markers). No raw HTML is ever rendered.
 */
export function Prose({ text, citeNumbers }: { text: string; citeNumbers: Map<string, number> }) {
  // Split into blocks; a heading line always starts its own block.
  const blocks: string[] = [];
  for (const raw of text.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = raw.split("\n");
    if (/^#{2,3}\s/.test(lines[0]) && lines.length > 1) { blocks.push(lines[0], lines.slice(1).join("\n")); }
    else blocks.push(raw);
  }
  return (
    <div className="prose-ar">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (/^###\s/.test(block)) return <h3 key={i}>{inline(block.replace(/^###\s/, ""), citeNumbers)}</h3>;
        if (/^##\s/.test(block)) return <h2 key={i}>{inline(block.replace(/^##\s/, ""), citeNumbers)}</h2>;
        if (lines.every((l) => /^>\s?/.test(l))) return <blockquote key={i}>{inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "), citeNumbers)}</blockquote>;
        if (lines.every((l) => /^\d+\.\s/.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\.\s/, ""), citeNumbers)}</li>)}</ol>;
        if (lines.every((l) => /^[-*]\s/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-*]\s/, ""), citeNumbers)}</li>)}</ul>;
        return <p key={i}>{inline(lines.join(" "), citeNumbers)}</p>;
      })}
    </div>
  );
}

function inline(text: string, cites: Map<string, number>): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\{\{cite:([\w-]+)\}\}|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const n = cites.get(m[1]);
      if (n) out.push(<sup key={k++}><a href={`#cite-${n}`} aria-label={`[${n}]`}>[{n}]</a></sup>);
    } else if (m[2]) out.push(<strong key={k++}>{m[2]}</strong>);
    else if (m[3]) {
      const url = m[4];
      out.push(url.startsWith("/") ? <Link key={k++} href={url}>{m[3]}</Link> : <a key={k++} href={url} rel="noopener noreferrer" target="_blank">{m[3]}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
