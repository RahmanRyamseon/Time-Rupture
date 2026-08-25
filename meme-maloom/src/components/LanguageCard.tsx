import Link from "next/link";
import type { LanguageInfo } from "@/lib/types";
import { getMemeCountByLanguage } from "@/lib/data";

export default function LanguageCard({ info }: { info: LanguageInfo }) {
  const count = getMemeCountByLanguage(info.language);
  return (
    <Link
      href={`/explore?language=${encodeURIComponent(info.language)}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-[28px] border border-navy-900/8 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-card-hover"
    >
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br from-violet-400/0 to-pink-400/0 blur-2xl transition-all duration-500 group-hover:from-violet-400/25 group-hover:to-pink-400/25"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold text-navy-900">{info.nativeName}</p>
          <p className="text-sm font-bold text-gradient">{info.language}</p>
        </div>
        <span className="shrink-0 rounded-full bg-navy-900/5 px-3 py-1 text-xs font-bold text-navy-700">
          {count} {count === 1 ? "meme" : "memes"}
        </span>
      </div>
      <p className="relative text-sm text-navy-600">{info.description}</p>
      <div className="relative flex flex-wrap gap-1.5">
        {info.popularTopics.map((topic) => (
          <span
            key={topic}
            className="rounded-full bg-mint-50 px-2.5 py-1 text-xs font-semibold text-mint-600"
          >
            {topic}
          </span>
        ))}
      </div>
      <div className="relative mt-1 rounded-2xl bg-gradient-to-br from-navy-900/5 to-violet-900/5 p-3">
        <p className="text-lg font-semibold text-navy-900">{info.examplePhrase.script}</p>
        <p className="text-xs font-bold text-navy-500">
          {info.examplePhrase.transliteration}
        </p>
        <p className="mt-1 text-xs text-navy-500">{info.examplePhrase.meaning}</p>
      </div>
      <span className="relative mt-1 text-sm font-bold text-violet-700 group-hover:underline">
        Explore {info.language} memes →
      </span>
    </Link>
  );
}
