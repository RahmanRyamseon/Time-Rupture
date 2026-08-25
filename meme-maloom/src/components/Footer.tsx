import Link from "next/link";
import Logo from "./Logo";

const columns = [
  {
    title: "Discover",
    links: [
      { href: "/explore", label: "Explore" },
      { href: "/languages", label: "Languages" },
      { href: "/regions", label: "Regions" },
      { href: "/categories", label: "Categories" },
      { href: "/trending", label: "Trending" },
    ],
  },
  {
    title: "Contribute",
    links: [
      { href: "/submit", label: "Submit a meme" },
      { href: "/community-guidelines", label: "Community Guidelines" },
      { href: "/copyright", label: "Copyright & Takedown" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-navy-950 text-navy-200">
      <div aria-hidden="true" className="bg-mesh pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2">
            <Logo withTagline variant="dark" />
            <p className="mt-4 max-w-sm text-sm text-navy-300">
              Meme Maloom is a Pan-India cultural archive and trend-discovery
              platform that explains the story behind the memes you scroll
              past — the language, the origin, and why it&apos;s funny.
            </p>
            <p className="mt-4 max-w-sm text-xs text-navy-400">
              Meme Maloom is an independent platform and is not affiliated
              with, endorsed by, or sponsored by Reddit, Instagram, YouTube,
              Know Your Meme, or any other platform referenced on this site.
            </p>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-display text-sm font-bold text-white">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-navy-300 transition hover:text-lime-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Meme Maloom. All meme rights belong to their original creators.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/privacy" className="hover:text-lime-400">Privacy Policy</Link>
            <Link href="/copyright" className="hover:text-lime-400">Copyright/Takedown</Link>
            <Link href="/community-guidelines" className="hover:text-lime-400">Guidelines</Link>
            <Link href="/contact" className="hover:text-lime-400">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
