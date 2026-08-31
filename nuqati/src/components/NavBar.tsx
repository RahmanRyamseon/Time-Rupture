"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/explore", label: "Explore Benefits" },
  { href: "/wallet", label: "My Wallet" },
  { href: "/swipe", label: "Smart Swipe" },
  { href: "/statement", label: "Statement Import" },
  { href: "/cheatsheet", label: "Cheat Sheet" },
  { href: "/fee-roi", label: "Fee ROI" },
  { href: "/points", label: "Points Value" },
  { href: "/transfers", label: "Transfers" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            ن
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Nuqati <span className="font-normal text-foreground/50">| نقاطي</span>
          </span>
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-1 overflow-x-auto text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-brand text-white"
                    : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
