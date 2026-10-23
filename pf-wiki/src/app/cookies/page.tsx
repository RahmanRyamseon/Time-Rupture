import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { CONTACT_EMAIL, COOKIE_LAST_UPDATED } from "@/lib/legal";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

const title = "Cookie Policy";
const description = `Which cookies ${SITE_NAME} uses, why, and how to control them.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cookies/" },
  openGraph: {
    type: "website",
    url: "/cookies/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
};

const COOKIES = [
  {
    category: "Strictly necessary",
    party: "First-party (local storage, not a cookie)",
    name: "pfwiki-consent",
    purpose: "Remembers your cookie choices so we don't ask again every visit.",
    duration: "Until you clear your browser's site data",
    canDisable: false,
  },
  {
    category: "Analytics",
    party: "Third-party — Google Analytics (Google LLC)",
    name: "_ga, _ga_*",
    purpose: "Distinguishes visitors and sessions so we can see aggregate traffic and which pages are actually useful.",
    duration: "Up to 2 years (per Google's defaults)",
    canDisable: true,
  },
  {
    category: "Advertising",
    party: "Third-party — Google AdSense (Google LLC)",
    name: "e.g. __gads, __gpi, IDE, test_cookie",
    purpose: "Used by Google to serve and measure ads, and — if you don't opt out — to personalize them based on interests.",
    duration: "Varies by cookie, typically up to 13 months",
    canDisable: true,
  },
];

export default function CookiePolicyPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/cookies/` },
    ],
  };

  return (
    <div className="flex flex-col gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-foreground/50">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        / <span aria-current="page">Cookie Policy</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cookie Policy</h1>
        <p className="mt-1 text-sm text-foreground/50">Last updated: {COOKIE_LAST_UPDATED}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">What this page covers</h2>
        <p className="text-foreground/80">
          {SITE_NAME} itself doesn&apos;t need cookies to function — there&apos;s no login, no cart,
          no session to track. The only cookies involved come from two optional third-party
          services, <strong>Google Analytics</strong> and <strong>Google AdSense</strong>, and
          neither loads until you explicitly accept them in the cookie banner.
        </p>
        <p className="text-foreground/80">
          By default, when you first visit, <strong>only strictly necessary local storage is
          used</strong> (to remember your choice) — no analytics or advertising cookies are set
          until you click &quot;Accept all&quot; or enable them individually under
          &quot;Customize&quot;.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Cookies and similar technologies in use</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-semibold">Category</th>
                <th className="py-2 pr-4 font-semibold">Set by</th>
                <th className="py-2 pr-4 font-semibold">Name(s)</th>
                <th className="py-2 pr-4 font-semibold">Purpose</th>
                <th className="py-2 pr-4 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.category} className="border-b border-border/60 align-top">
                  <td className="py-3 pr-4 font-medium">{c.category}</td>
                  <td className="py-3 pr-4 text-foreground/70">{c.party}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-foreground/70">{c.name}</td>
                  <td className="py-3 pr-4 text-foreground/70">{c.purpose}</td>
                  <td className="py-3 pr-4 text-foreground/70">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-foreground/50">
          Exact cookie names are set by Google and can change without notice on their end; this
          table reflects Google&apos;s publicly documented cookies for Analytics and AdSense as of
          the &quot;last updated&quot; date above.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Current status of advertising</h2>
        <p className="text-foreground/80">
          {SITE_NAME} intends to run Google AdSense to help cover hosting costs. The consent
          infrastructure described on this page — the banner, and the code that gates loading
          Google&apos;s scripts on your consent — is live. Whether ads actually appear depends on
          AdSense account approval and configuration, which may not be complete yet. Either way,
          no advertising cookies are set unless you&apos;ve consented <em>and</em> AdSense is
          actually configured.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">How to control cookies</h2>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>
            Use <CookieSettingsButton className="font-medium text-brand-strong underline hover:no-underline" />{" "}
            (also linked in the footer of every page) to accept, reject, or customize analytics
            and advertising cookies at any time.
          </li>
          <li>
            Your browser lets you block or delete cookies directly — check your browser&apos;s
            settings (usually under &quot;Privacy &amp; security&quot;). Blocking all cookies may
            affect how some third-party content behaves, though {SITE_NAME} itself will keep
            working.
          </li>
          <li>
            If your browser or an extension sends a Global Privacy Control (GPC) signal, we treat
            it as an opt-out automatically and skip the banner.
          </li>
          <li>
            Google provides its own controls for ad personalization at{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              adssettings.google.com
            </a>{" "}
            and an opt-out browser add-on for Google Analytics.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Questions</h2>
        <p className="text-foreground/80">
          Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-strong hover:underline">
            {CONTACT_EMAIL}
          </a>
          . See also the{" "}
          <Link href="/privacy/" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
