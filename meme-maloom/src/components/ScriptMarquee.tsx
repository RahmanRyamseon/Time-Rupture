import { languageInfo } from "@/lib/data";

export default function ScriptMarquee() {
  const items = languageInfo.filter((l) => l.examplePhrase.script !== "—");
  const doubled = [...items, ...items];

  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden border-y-2 border-navy-900/10 bg-white py-3"
    >
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
        {doubled.map((l, i) => (
          <span key={`${l.language}-${i}`} className="flex items-center gap-2 text-navy-700">
            <span className="font-display text-lg font-bold">{l.examplePhrase.script}</span>
            <span className="text-xs font-semibold text-navy-400">{l.language}</span>
            <span className="ml-8 text-saffron-300">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
