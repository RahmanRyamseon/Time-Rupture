const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

export type TextToken = { type: "text"; value: string } | { type: "link"; label: string; href: string };

/**
 * Parses a minimal `[label](href)` markdown-link syntax out of plain content
 * strings (problems.ts bullet arrays), so cross-references like
 * "see the KYC entry" can render as real internal links without switching
 * the whole dataset over to a markdown/MDX renderer.
 */
export function parseLinkedText(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(LINK_PATTERN)) {
    const [full, label, href] = match;
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ type: "text", value: text.slice(lastIndex, index) });
    tokens.push({ type: "link", label, href });
    lastIndex = index + full.length;
  }
  if (lastIndex < text.length) tokens.push({ type: "text", value: text.slice(lastIndex) });
  return tokens;
}

/** Strips `[label](href)` down to plain `label` — for JSON-LD and other plain-text contexts. */
export function stripLinks(text: string): string {
  return text.replace(LINK_PATTERN, "$1");
}
