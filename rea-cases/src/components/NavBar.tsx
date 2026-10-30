"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/by-app", label: "By app" },
  { href: "/evidence", label: "Evidence" },
  { href: "/new", label: "New" },
  { href: "/resources", label: "Resources" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-mono text-xs font-bold text-white">
            RE
          </span>
          <span className="text-lg font-semibold tracking-tight">
            REA Cases{" "}
            <span className="hidden font-normal text-foreground/50 sm:inline">
              | what AI rebuilt
            </span>
          </span>
        </Link>
        <nav
          aria-label="Primary"
          className="flex flex-1 items-center justify-end gap-1 overflow-x-auto text-sm"
        >
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
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
