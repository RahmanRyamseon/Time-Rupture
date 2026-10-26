import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { CONTACT_EMAIL, COOKIE_LAST_UPDATED } from "@/lib/legal";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `Which cookies and similar technologies ${SITE_NAME} uses, why, and how to control them.`,
};

const COOKIES = [
  {
    category: "Strictly necessary",
    party: "First-party (local storage, not a cookie)",
    name: "edurozgar-consent, edurozgar-dashboard-prefs, edurozgar-saved-opportunities, edurozgar-application-status, edurozgar-submissions, edurozgar-admin-token",
    purpose:
      "Remembers your cookie choice, saved opportunities, dashboard preferences, draft feedback-form entries, and (on the admin page only) your own admin session token — entirely in your browser.",
    duration: "Until you clear your browser's site data",
    canDisable: false,
  },
  {
    category: "Analytics",
    party: "Third-party — Google Analytics (not currently active)",
    name: "_ga, _ga_* (if enabled)",
    purpose: "Would distinguish visitors/sessions to show aggregate traffic and which pages are useful. No analytics property is configured today, so nothing is actually set yet.",
    duration: "Up to 2 years (Google's default), if ever enabled",
    canDisable: true,
  },
  {
    category: "Advertising",
    party: "Third-party — Google AdSense (not currently active)",
    name: "e.g. __gads, __gpi, IDE (if enabled)",
    purpose: "Would be used by Google to serve and measure ads, and personalize them if you don't opt out. Not in use today.",
    duration: "Varies, typically up to 13 months, if ever enabled",
    canDisable: true,
  },
];

export default function CookiesPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Cookie Policy", item: `${SITE_URL}/cookies` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }} />

      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Cookie Policy</h1>
      <p className="mt-1 text-xs text-slate-500">Last updated: {COOKIE_LAST_UPDATED}</p>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">What this page covers</h2>
        <p className="mt-2">
          {SITE_NAME} itself does not need cookies to function — browsing, searching and filtering opportunities
          works without any. The data behind Saved Opportunities, Dashboard preferences and the Report/Suggest forms
          lives in your browser&apos;s local storage rather than a cookie, but we list it below for completeness
          since it is still information stored on your device. The only true cookies that could ever be set come
          from two optional third-party services, <strong>Google Analytics</strong> and <strong>Google AdSense</strong>
          — neither is switched on today, and neither will load until you explicitly accept it in the cookie
          banner.
        </p>
        <p className="mt-2">
          By default, on your first visit, <strong>only strictly necessary local storage is used</strong> (to
          remember your cookie choice) — nothing else is set until you click &quot;Accept all&quot; or enable a
          category individually under &quot;Customize&quot;.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Cookies and similar technologies in use</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left">
                <th className="py-2 pr-4 font-semibold text-[var(--foreground)]">Category</th>
                <th className="py-2 pr-4 font-semibold text-[var(--foreground)]">Set by</th>
                <th className="py-2 pr-4 font-semibold text-[var(--foreground)]">Name(s)</th>
                <th className="py-2 pr-4 font-semibold text-[var(--foreground)]">Purpose</th>
                <th className="py-2 pr-4 font-semibold text-[var(--foreground)]">Duration</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.category} className="border-b border-[var(--color-border)]/60 align-top">
                  <td className="py-3 pr-4 font-medium text-[var(--foreground)]">{c.category}</td>
                  <td className="py-3 pr-4">{c.party}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{c.name}</td>
                  <td className="py-3 pr-4">{c.purpose}</td>
                  <td className="py-3 pr-4">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Exact cookie names are set by Google and can change without notice on their end; this table reflects
          Google&apos;s publicly documented cookies for Analytics and AdSense as of the &quot;last updated&quot;
          date above.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">How to control cookies</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            Use <CookieSettingsButton className="font-semibold text-[var(--color-teal)] underline" /> (also linked
            in the footer of every page) to accept, reject, or customize analytics and advertising cookies at any
            time.
          </li>
          <li>
            Your browser lets you block or delete cookies and local storage directly, usually under &quot;Privacy
            &amp; security&quot; settings. Clearing local storage also deletes your saved opportunities and
            dashboard preferences.
          </li>
          <li>
            If your browser or an extension sends a Global Privacy Control (GPC) signal, we treat it as an automatic
            opt-out and skip showing the banner — see{" "}
            <Link href="/do-not-sell" className="underline hover:text-[var(--color-teal)]">
              Do Not Sell or Share My Personal Information
            </Link>
            .
          </li>
          <li>
            If analytics or advertising is ever switched on, Google provides its own controls at{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--color-teal)]"
            >
              adssettings.google.com
            </a>{" "}
            and an opt-out browser add-on for Google Analytics.
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Questions</h2>
        <p className="mt-2">
          Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--color-teal)] underline">
            {CONTACT_EMAIL}
          </a>
          . See also the{" "}
          <Link href="/privacy" className="underline hover:text-[var(--color-teal)]">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
