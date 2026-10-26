import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/security", label: "Security" },
  { href: "/terms", label: "Terms of Service" },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-6 text-center text-xs text-foreground/50">
      <p>Nuqati — a Bahrain-first GCC credit card rewards optimizer. No bank login required.</p>
      <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="underline-offset-2 hover:text-foreground hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
