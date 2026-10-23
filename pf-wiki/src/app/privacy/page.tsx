import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { OPERATOR_TYPE, CONTACT_EMAIL, PRIVACY_LAST_UPDATED } from "@/lib/legal";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

const title = "Privacy Policy";
const description = `How ${SITE_NAME} collects, uses, and protects information, and your rights under Indian law.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy/" },
  openGraph: {
    type: "website",
    url: "/privacy/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
};

export default function PrivacyPolicyPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/privacy/` },
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
        / <span aria-current="page">Privacy Policy</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-1 text-sm text-foreground/50">Last updated: {PRIVACY_LAST_UPDATED}</p>
      </div>

      <div className="card-surface rounded-2xl p-5 text-sm text-foreground/80">
        <p>
          <strong>Legal review notice:</strong> This policy is written in plain language to
          accurately describe how this specific, small, non-commercial website actually works. It
          is <strong>not</strong> a substitute for advice from a qualified privacy lawyer. If you
          operate a business and need this reviewed for your own compliance obligations, have a
          lawyer check it against your actual data flows before relying on it.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">1. Who runs this site</h2>
        <p className="text-foreground/80">
          {SITE_NAME} ({SITE_URL}) is {OPERATOR_TYPE}. It is not a company, is not affiliated with
          the Employees&apos; Provident Fund Organisation (EPFO) or the Government of India, and
          does not provide any PF-related services, filings, or transactions — it is purely an
          informational reference.
        </p>
        <p className="text-foreground/80">
          For privacy questions, data requests, or complaints, contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-strong hover:underline">
            {CONTACT_EMAIL}
          </a>
          . As a one-person, non-commercial project there is no separate Data Protection Officer;
          the contact above handles all privacy requests directly.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">2. What data is actually collected</h2>
        <p className="text-foreground/80">
          {SITE_NAME} is a fully static website. There are no user accounts, no logins, no sign-up
          or contact forms, no payments, and no server-side database that stores anything about
          visitors. The on-page search box runs entirely in your browser and never sends your
          search terms anywhere.
        </p>
        <p className="text-foreground/80">What actually touches your data, in practice:</p>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>
            <strong>Hosting logs.</strong> Our hosting provider, Vercel, automatically processes
            standard web-server request data (IP address, browser/device information, requested
            URL, timestamps) to serve pages and keep the service secure. We don&apos;t access this
            as a personal dataset about individuals; it exists at the infrastructure level. See
            Vercel&apos;s own privacy policy for how they handle it.
          </li>
          <li>
            <strong>Analytics cookies (optional, off by default).</strong> If you accept analytics
            cookies in the cookie banner, we use Google Analytics to understand aggregate traffic
            and which pages are useful — not to identify you individually. Nothing loads until you
            consent; see the{" "}
            <Link href="/cookies/" className="underline hover:text-foreground">
              Cookie Policy
            </Link>{" "}
            for exactly what Google Analytics sets and why.
          </li>
          <li>
            <strong>Advertising cookies (optional, off by default).</strong> {SITE_NAME} intends
            to run Google AdSense to help cover hosting costs. Ad-related cookies, like analytics
            cookies, only load if you explicitly consent via the cookie banner. Ad personalization
            and the data Google collects for it are controlled by Google — see Section 7 and the
            Cookie Policy.
          </li>
          <li>
            <strong>Nothing you type into the search box is collected, stored, or transmitted.</strong>{" "}
            It filters the page content already loaded in your browser.
          </li>
        </ul>
        <p className="text-foreground/80">
          We do not knowingly collect names, phone numbers, UAN/PF account numbers, Aadhaar
          numbers, bank details, or any other sensitive personal data — and we ask that you never
          paste such details anywhere on this site (there is nowhere for them to go, but please
          don&apos;t post them in any future comments feature either, if one is ever added).
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">3. Why we process what little data exists</h2>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>Hosting-log data: legitimate interest in operating, securing, and debugging the site.</li>
          <li>Analytics cookies: your freely given, specific consent — used only to improve content.</li>
          <li>
            Advertising cookies: your freely given, specific consent — used to show ads that keep
            {` ${SITE_NAME} `} free to use.
          </li>
        </ul>
        <p className="text-foreground/80">
          We do not sell personal data, and we do not share any personal data with third parties
          for cross-context behavioural advertising beyond what Google Analytics/AdSense
          themselves process once you&apos;ve consented — see Section 6.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">4. Your rights under Indian law (DPDPA 2023)</h2>
        <p className="text-foreground/80">
          India&apos;s data protection law is the{" "}
          <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong>. Under it, you (the
          &quot;Data Principal&quot;) generally have the right to:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>obtain a summary of the personal data we process about you and how it&apos;s used;</li>
          <li>have inaccurate or incomplete personal data corrected, updated, or erased;</li>
          <li>withdraw consent at any time, as easily as you gave it (reopen the cookie banner via the &quot;Cookie settings&quot; link in the footer, or clear your browser&apos;s site data);</li>
          <li>nominate another individual to exercise these rights on your behalf in the event of death or incapacity;</li>
          <li>lodge a grievance with us first, and if unresolved, with the Data Protection Board of India.</li>
        </ul>
        <p className="text-foreground/80">
          To exercise any of these, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-strong hover:underline">
            {CONTACT_EMAIL}
          </a>
          . Given how little data we actually hold (see Section 2), most requests can be resolved
          by simply clearing your cookie consent and browser storage — we aim to respond to any
          request within 30 days.
        </p>
        <p className="text-foreground/80">
          If you are located outside India, other laws (such as the EU/UK GDPR) may also give you
          rights — the mechanisms above (email us, or manage cookies locally) work the same way
          regardless of where you are.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">5. &quot;Do Not Sell or Share My Personal Information&quot;</h2>
        <p className="text-foreground/80">
          {SITE_NAME} does not sell personal data, and does not have an account system or any
          mechanism to sell or trade user data. The closest equivalent on a site like this is ad
          personalization: Google may use advertising cookies (once you&apos;ve consented) for
          interest-based ads. You can opt out of that at any time via{" "}
          <CookieSettingsButton className="font-medium text-brand-strong underline hover:no-underline" />{" "}
          (also in the footer) — select &quot;Reject non-essential&quot; or untick &quot;Advertising&quot;.
          If your browser sends a Global Privacy Control (GPC) signal, we honour it automatically
          and skip showing the cookie banner, treating it as an opt-out.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">6. Third parties and international transfers</h2>
        <p className="text-foreground/80">The only third-party services involved are:</p>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>
            <strong>Vercel Inc.</strong> — hosting and content delivery (hosting logs, as above).
          </li>
          <li>
            <strong>Google LLC</strong> — Google Analytics and Google AdSense, only after you
            consent via the cookie banner. Google processes this data on servers that may be
            located outside India, under its own published privacy and data-transfer safeguards.
          </li>
        </ul>
        <p className="text-foreground/80">
          We do not use payment processors, email marketing tools, customer-support platforms, or
          any other third-party integrations, because the site doesn&apos;t collect payments,
          emails, or support tickets.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">7. Cookies</h2>
        <p className="text-foreground/80">
          See the dedicated{" "}
          <Link href="/cookies/" className="underline hover:text-foreground">
            Cookie Policy
          </Link>{" "}
          for the full list of cookies, what each one does, and how to control them.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">8. Data retention</h2>
        <p className="text-foreground/80">
          We don&apos;t operate a database of personal data, so there&apos;s nothing we retain on
          our end. Your cookie-consent choice is stored only in your own browser (not sent to us)
          until you clear it or change it. Hosting-provider logs are retained only as long as
          Vercel&apos;s own infrastructure policies specify, for security and operational purposes.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">9. Children&apos;s privacy</h2>
        <p className="text-foreground/80">
          {SITE_NAME} is a general-audience reference site and is not directed at children. We do
          not knowingly collect personal data from anyone under 18. If you believe a child has
          provided us personal data (for example, through a future contact feature), email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-strong hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          and we will remove it.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">10. Changes to this policy</h2>
        <p className="text-foreground/80">
          If what this site collects or does changes materially — for example, when Google
          AdSense actually goes live, or if accounts or forms are ever added — we&apos;ll update
          this page and the &quot;Last updated&quot; date above. Significant changes affecting your
          rights will also be reflected in the cookie banner so you can re-confirm your choices.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">11. Security</h2>
        <p className="text-foreground/80">
          See the dedicated{" "}
          <Link href="/security/" className="underline hover:text-foreground">
            Security Information
          </Link>{" "}
          page for how this site is protected.
        </p>
      </section>
    </div>
  );
}
