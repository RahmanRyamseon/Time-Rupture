import { languageInfo } from "@/lib/data";

export default function ScriptMarquee() {
  const items = languageInfo.filter((l) => l.examplePhrase.script !== "—");
  const doubled = [...items, ...items];

  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden border-y border-white/10 bg-navy-950 py-3.5"
    >
      <div aria-hidden="true" className="bg-mesh pointer-events-none absolute inset-0 opacity-30" />
      <div className="animate-marquee relative flex w-max gap-3 whitespace-nowrap">
        {doubled.map((l, i) => (
          <span
            key={`${l.language}-${i}`}
            className="glass-dark flex items-center gap-2 rounded-full px-4 py-1.5 text-white"
          >
            <span className="font-display text-lg font-bold">{l.examplePhrase.script}</span>
            <span className="text-xs font-semibold text-navy-300">{l.language}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
