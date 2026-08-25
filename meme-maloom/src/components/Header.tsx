"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import Button from "./Button";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "glass shadow-[0_1px_0_rgba(19,16,32,0.06)]" : "border-b border-transparent bg-cream/70 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-sm font-bold transition",
                  active
                    ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-[var(--shadow-glow-violet)]"
                    : "text-navy-700 hover:bg-navy-900/5 hover:text-violet-700"
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

        <Button
          href="/submit"
          size="md"
          className="ml-auto hidden shrink-0 sm:inline-flex"
        >
          Submit Meme
        </Button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-navy-900/15 text-navy-900 transition hover:border-violet-400 lg:hidden"
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
        <div id="mobile-menu" className="glass border-t border-navy-900/10 px-4 pb-5 lg:hidden">
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
                    active
                      ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white"
                      : "text-navy-800 hover:bg-navy-900/5"
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
