import type { Citation } from "./types";

export interface Footnotes {
  list: Citation[];
  byField: Record<string, number[]>;
}

/** Number citations in field order of appearance (1-based), de-duplicated by URL. */
export function buildFootnotes(citations: Citation[], fieldOrder: string[]): Footnotes {
  const order = new Map(fieldOrder.map((f, i) => [f, i]));
  const sorted = [...citations].sort(
    (a, b) => (order.get(a.field_name) ?? 999) - (order.get(b.field_name) ?? 999) || a.sort_order - b.sort_order,
  );
  const list: Citation[] = [];
  const indexByUrl = new Map<string, number>();
  const byField: Record<string, number[]> = {};
  for (const c of sorted) {
    let n = indexByUrl.get(c.url);
    if (!n) {
      list.push(c);
      n = list.length;
      indexByUrl.set(c.url, n);
    }
    const nums = (byField[c.field_name] ??= []);
    if (!nums.includes(n)) nums.push(n);
  }
  return { list, byField };
}
