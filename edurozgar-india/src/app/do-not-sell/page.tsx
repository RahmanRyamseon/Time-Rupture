import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { CONTACT_EMAIL, DNS_LAST_UPDATED } from "@/lib/legal";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

export const metadata: Metadata = {
  title: "Do Not Sell or Share My Personal Information",
  description: `${SITE_NAME} does not sell personal data. How to opt out of advertising-related data use if it is ever enabled.`,
};

export default function DoNotSellPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Do Not Sell or Share My Personal Information",
        item: `${SITE_URL}/do-not-sell`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }} />

      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
        Do Not Sell or Share My Personal Information
      </h1>
      <p className="mt-1 text-xs text-slate-500">Last updated: {DNS_LAST_UPDATED}</p>

      <section className="mt-6">
        <p>
          <strong>{SITE_NAME} does not sell personal data</strong>, and has no account system, data-broker
          relationship, or other mechanism through which personal data could be sold or traded. We also do not
          currently engage in cross-context behavioural advertising — see Section 2 of the{" "}
          <Link href="/privacy" className="underline hover:text-[var(--color-teal)]">
            Privacy Policy
          </Link>{" "}
          for exactly what little personal data this site collects.
        </p>
        <p className="mt-3">
          The closest equivalent risk on a site like this is ad personalization: if advertising (e.g. Google
          AdSense) is ever enabled, Google may use advertising cookies — but only after you have consented via the
          cookie banner — to show interest-based ads. That is the only scenario in which anything resembling
          &quot;sharing&quot; of browsing data with a third party for advertising purposes would occur, and it does
          not happen today.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">How to opt out</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            Use <CookieSettingsButton className="font-semibold text-[var(--color-teal)] underline" /> (also in the
            footer) and select &quot;Reject non-essential&quot;, or untick &quot;Advertising&quot; under
            &quot;Customize&quot;. This keeps any future ad-personalization cookies from loading.
          </li>
          <li>
            <strong>Global Privacy Control (GPC):</strong> if your browser or an extension sends a GPC signal, we
            detect and honour it automatically as an opt-out — the cookie banner won&apos;t even need to ask, and
            analytics/advertising stay off.
          </li>
          <li>
            Nothing to opt out of today beyond the above: there is no sale of data, no mailing list, and no account
            to delete, because none of these exist on this site yet.
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Legal basis for this page</h2>
        <p className="mt-2">
          This page exists to meet &quot;Do Not Sell or Share&quot; / opt-out-signal expectations under
          California-style privacy laws (such as the CCPA/CPRA) that some visitors may be used to, even though
          {` ${SITE_NAME} `} is operated from and primarily serves users in India under the DPDPA 2023, which does
          not use the same &quot;sale of data&quot; framework.{" "}
          <strong>
            Legal review flag: whether this page is legally required for this site&apos;s specific user base and
            business location, and whether it fully satisfies the opt-out-preference-signal requirements of any
            specific state or national law, should be confirmed by a qualified privacy lawyer rather than assumed
            from this page alone.
          </strong>
        </p>
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
          </Link>{" "}
          and{" "}
          <Link href="/cookies" className="underline hover:text-[var(--color-teal)]">
            Cookie Policy
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
