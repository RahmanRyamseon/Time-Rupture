import type { Metadata } from "next";
import LanguageCard from "@/components/LanguageCard";
import { languageInfo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Explore Memes by Language",
  description:
    "Browse Indian memes by language — Hindi/Hinglish, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi and more, each with an example phrase and translation.",
};

export default function LanguagesPage() {
  return (
    <div className="relative">
      <div aria-hidden="true" className="bg-mesh-light pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 max-w-2xl">
          <p className="text-xs font-bold tracking-widest text-gradient uppercase">
            10 languages, one country
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-navy-900 sm:text-4xl">
            Explore by language
          </h1>
          <p className="mt-2 text-navy-600">
            Every meme is tagged with its original language, plus a
            translation and transliteration — so you never have to guess what
            a caption means.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {languageInfo.map((info) => (
            <LanguageCard key={info.language} info={info} />
          ))}
        </div>
      </div>
    </div>
  );
}
