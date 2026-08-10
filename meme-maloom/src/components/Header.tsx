"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/languages", label: "Languages" },
  { href: "/regions", label: "Regions" },
  { href: "/categories", label: "Categories" },
  { href: "/trending", label: "Trending" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-navy-900/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Logo />

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 lg:flex"
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-bold transition",
                  active
                    ? "bg-navy-900 text-white"
                    : "text-navy-700 hover:bg-navy-900/5 hover:text-navy-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden flex-1 md:flex md:max-w-md">
          <SearchBar />
        </div>

        <Link
          href="/submit"
          className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-pink-500 px-4 py-2.5 text-sm font-bold text-white shadow-sticker transition hover:bg-pink-600 active:translate-y-0.5 active:shadow-none sm:inline-flex"
        >
          Submit Meme
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-navy-900/15 text-navy-900 lg:hidden"
        >
          {open ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {open ? (
        <div id="mobile-menu" className="border-t-2 border-navy-900/10 bg-cream px-4 pb-5 lg:hidden">
          <div className="pt-3 pb-2 md:hidden">
            <SearchBar />
          </div>
          <nav aria-label="Mobile" className="mt-1 flex flex-col gap-1">
            {[...NAV_LINKS, { href: "/submit", label: "Submit Meme" }].map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-base font-bold transition",
                    active ? "bg-navy-900 text-white" : "text-navy-800 hover:bg-navy-900/5"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
