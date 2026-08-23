"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function SearchBar({
  className,
  size = "md",
  autoFocus = false,
  defaultValue = "",
}: {
  className?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(`/explore${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        "flex items-center gap-2 rounded-full border-2 border-navy-900/15 bg-white pl-4 pr-1.5 shadow-sm transition focus-within:border-saffron-500 focus-within:ring-4 focus-within:ring-saffron-500/15",
        size === "lg" ? "py-1.5" : "py-1",
        className
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0 text-navy-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" strokeLinecap="round" />
      </svg>
      <label htmlFor="site-search" className="sr-only">
        Search a meme, dialogue, language or movie
      </label>
      <input
        id="site-search"
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search a meme, dialogue, language or movie"
        className={cn(
          "min-w-0 flex-1 bg-transparent text-navy-900 outline-none placeholder:text-navy-400",
          size === "lg" ? "text-base" : "text-sm"
        )}
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-saffron-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-saffron-600 active:scale-95"
      >
        Search
      </button>
    </form>
  );
}
