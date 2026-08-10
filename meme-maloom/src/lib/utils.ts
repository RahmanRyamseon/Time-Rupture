export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// Hand-rolled rather than Intl's compact notation: ICU data availability for
// "en-IN" compact abbreviations can differ between server and browser
// runtimes, which produces server/client hydration mismatches. This is
// deterministic everywhere.
export function formatCompactNumber(value: number): string {
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, "");
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trim(value / 1_000)}K`;
  return String(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function distribution<T>(
  items: T[],
  key: (item: T) => string
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
