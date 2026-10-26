import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { OPERATOR_TYPE, CONTACT_EMAIL, PRIVACY_LAST_UPDATED } from "@/lib/legal";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses and protects personal information, and your rights under Indian law.`,
};

export default function PrivacyPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Privacy Policy", item: `${SITE_URL}/privacy` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }} />

      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Privacy Policy</h1>
      <p className="mt-1 text-xs text-slate-500">Last updated: {PRIVACY_LAST_UPDATED}</p>

      <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <strong>Legal review notice:</strong> This policy is written in plain language to describe, as accurately as
        possible, how this specific site actually works today. It is <strong>not</strong> a substitute for advice
        from a qualified privacy lawyer. If {SITE_NAME} is operated by a registered business, adds payments,
        accounts, or new data collection, or needs to rely on this for regulatory compliance, have a lawyer review it
        against the site&apos;s actual data flows at that time before relying on it. Specific areas flagged for that
        review are called out below.
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">1. Who runs this site</h2>
        <p className="mt-2">
          {SITE_NAME} ({SITE_URL}) is {OPERATOR_TYPE}, run by an individual. It is not affiliated with, endorsed by,
          or operated by the Government of India, any state government, or any recruiting, examination or
          educational authority — see the{" "}
          <Link href="/about" className="font-semibold text-[var(--color-teal)] underline">
            About
          </Link>{" "}
          page.{" "}
          <strong>
            Legal review flag: if this platform is ever run by a registered company, this section needs the
            company&apos;s legal name, registration details and registered address added, confirmed by a lawyer.
          </strong>
        </p>
        <p className="mt-2">
          For privacy questions, data requests, or complaints, contact:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--color-teal)] underline">
            {CONTACT_EMAIL}
          </a>
          . As an individually run, non-commercial project there is currently no separate Data Protection Officer;
          the contact above handles all privacy requests directly.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">2. What personal data we actually collect</h2>
        <p className="mt-2">
          {SITE_NAME} does not require an account, a login, or any payment to search, filter, or read opportunity
          listings. There is no e-commerce, no checkout, and no newsletter sign-up form. What actually touches
          personal data, in practice:
        </p>
        <ul className="mt-2 list-disc space-y-3 pl-5">
          <li>
            <strong>Dashboard preferences (optional, browser-only).</strong> The{" "}
            <Link href="/dashboard" className="underline hover:text-[var(--color-teal)]">
              My Dashboard
            </Link>{" "}
            page lets you optionally enter an email address and/or mobile number, alongside alert preferences and
            saved-opportunity status tracking. <strong>This is stored only in your own browser&apos;s local storage
            and is never transmitted to our servers</strong> — we cannot see it, and clearing your browser&apos;s
            site data deletes it completely. It exists so alert delivery can be wired up to a real notification
            service in the future; until then, it does nothing beyond remembering your preference on your own
            device.
          </li>
          <li>
            <strong>&quot;Report outdated information&quot; and &quot;Suggest an opportunity&quot; forms (optional
            email).</strong> These forms, on every opportunity page, let you optionally give an email address.{" "}
            <strong>Like dashboard preferences, this is a demo stored only in your own browser&apos;s local
            storage</strong> and is not sent to EduRozgar India or visible to anyone else, including our site
            administrators. A production deployment that actually routes these to a moderation team would update
            this Privacy Policy before going live.
          </li>
          <li>
            <strong>Hosting-level logs.</strong> Our hosting provider, Vercel, automatically processes standard
            web-server request data (IP address, browser/device information, requested URL, timestamps) to serve
            pages and keep the service secure. We do not access this as a personal dataset about individual
            visitors; it exists at the infrastructure level. See Vercel&apos;s own privacy policy for how it handles
            this data.
          </li>
          <li>
            <strong>Analytics cookies (optional, off by default, not currently active).</strong> No analytics
            property is configured on this site today. If one is added later, it would be Google Analytics, and —
            as with every optional cookie here — nothing would load until you consent via the cookie banner. See the{" "}
            <Link href="/cookies" className="underline hover:text-[var(--color-teal)]">
              Cookie Policy
            </Link>
            .
          </li>
          <li>
            <strong>Advertising cookies (optional, off by default, not currently active).</strong> Same as above —
            reserved infrastructure, nothing live yet.
          </li>
        </ul>
        <p className="mt-3">
          We do <strong>not</strong> collect: account passwords, payment or billing data, government ID numbers
          (Aadhaar, PAN, etc.), precise device/location data, or your religion or other sensitive personal data, as a
          condition of using search, filters, or the dashboard. Where any listing&apos;s official scheme genuinely
          requires a community/category certificate, that requirement comes from the official notification —
          you provide such documents directly to the government authority processing your application, never to
          {` ${SITE_NAME}`}.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">3. How data is collected</h2>
        <p className="mt-2">
          Only two mechanisms exist today: (a) the optional form fields described in Section 2, which you type in
          directly, stored only in your browser; and (b) the automatic hosting-level logging described above, plus
          optional cookies once you consent to them. {SITE_NAME} does not use tracking pixels, server-side
          contact-form submission, customer-support ticketing tools, or third-party data-broker APIs.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">4. Legal basis / purpose for processing</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>Hosting-log data: legitimate interest in operating, securing and debugging the site.</li>
          <li>
            Optional dashboard/feedback fields: your own choice to enter them (consent) — and since they never leave
            your browser today, there is no further processing by us to have a legal basis for.
          </li>
          <li>Analytics cookies, if ever enabled: your freely given, specific consent.</li>
          <li>Advertising cookies, if ever enabled: your freely given, specific consent.</li>
          <li>Responding to a privacy request you send us by email: legal obligation / your request.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">5. How data is used</h2>
        <p className="mt-2">
          The opportunity listings themselves (scholarships, jobs, admissions) are public reference content, not
          personal data. The limited personal data described in Section 2 is used only for the purpose you supplied
          it — remembering your own dashboard preferences on your own device, or (in a future live version) letting
          our moderators follow up on a report or suggestion. We do not use personal data for profiling, automated
          decision-making, or sharing with data brokers.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">6. Third parties</h2>
        <p className="mt-2">The services involved in running this site are:</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>Vercel Inc.</strong> — hosting, content delivery and the hosting-level logs described above.
          </li>
          <li>
            <strong>Supabase</strong> — hosts the database of public opportunity listings and the internal
            source-verification/review queue used to keep listings current. This database does not store personal
            data about visitors; it is read-only for the public, and write access is restricted (see Section 11).
          </li>
          <li>
            <strong>Google LLC</strong> — only if/when Google Analytics or Google AdSense is actually switched on,
            and only after you consent via the cookie banner. Until then, no data is shared with Google through this
            site.
          </li>
        </ul>
        <p className="mt-2">
          We do not use payment processors, email-marketing platforms, or customer-support platforms, because the
          site does not collect payments, run a mailing list, or operate a support-ticket system.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          7. Sale of data, cross-context behavioural advertising, and opt-out
        </h2>
        <p className="mt-2">
          {SITE_NAME} does not sell personal data and has no mechanism to do so. We also do not currently engage in
          cross-context behavioural advertising. If advertising is enabled in the future, any ad-personalization
          cookies would require your consent and would be covered on a dedicated{" "}
          <Link href="/do-not-sell" className="underline hover:text-[var(--color-teal)]">
            Do Not Sell or Share My Personal Information
          </Link>{" "}
          page, which already exists and explains your opt-out options (including honouring a Global Privacy Control
          signal). You can manage cookie consent at any time via{" "}
          <CookieSettingsButton className="font-semibold text-[var(--color-teal)] underline" /> (also in the footer).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">8. Data retention</h2>
        <p className="mt-2">
          We do not operate a server-side database of personal data about visitors, so there is nothing of that kind
          for us to retain. Your dashboard preferences, saved opportunities, and form drafts live only in your own
          browser until you clear them. Your cookie-consent choice is stored the same way. Hosting-provider logs are
          retained only as long as Vercel&apos;s own infrastructure policies specify, for security and operational
          purposes. The opportunity-listing database (public content, not personal data) and its internal
          review/audit history are retained indefinitely for record-keeping, since they contain no personal data
          about site visitors.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">9. International data transfers</h2>
        <p className="mt-2">
          Our hosting (Vercel) and database (Supabase) providers operate global infrastructure, and the specific
          region(s) processing a given request can vary.{" "}
          <strong>
            Legal review flag: we have not independently confirmed the exact data-residency region configured for
            this project&apos;s database, and have not implemented a specific cross-border-transfer safeguard
            (such as Standard Contractual Clauses). If this matters for your jurisdiction, or before this platform
            scales beyond its current non-commercial scope, a qualified privacy lawyer should confirm the actual
            hosting region(s) in use and advise on the correct safeguard, if any is legally required.
          </strong>{" "}
          In practice, given how little personal data this site holds (Section 2), the realistic exposure from any
          such transfer is low.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">10. Your privacy rights</h2>
        <p className="mt-2">
          India&apos;s data protection law is the <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong>.
          Under it, and as a general practice regardless of where you are, you generally have the right to:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li><strong>Access</strong> — ask what personal data we hold about you.</li>
          <li><strong>Correction</strong> — ask us to correct inaccurate data.</li>
          <li><strong>Deletion</strong> — ask us to delete personal data, or do it yourself instantly via the dashboard&apos;s &quot;Delete my dashboard data&quot; control or your browser&apos;s site-data settings.</li>
          <li><strong>Portability</strong> — ask for a copy of data you provided, in a usable format.</li>
          <li><strong>Objection / restriction</strong> — object to, or ask us to limit, a specific processing activity.</li>
          <li><strong>Withdrawal of consent</strong> — reopen cookie settings at any time and change your choice, as easily as you gave it.</li>
          <li><strong>Nomination</strong> — under the DPDPA, nominate another individual to exercise these rights on your behalf in the event of death or incapacity.</li>
          <li><strong>Complaint</strong> — raise a grievance with us first, and if unresolved, with the Data Protection Board of India (or your own jurisdiction&apos;s regulator, such as a data protection authority under the EU/UK GDPR, if you are located outside India).</li>
        </ul>

        <h3 className="mt-4 font-semibold text-[var(--foreground)]">How to submit a request</h3>
        <p className="mt-2">
          Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--color-teal)] underline">
            {CONTACT_EMAIL}
          </a>{" "}
          describing what you want. Given how little data we hold server-side, most requests resolve immediately by
          clearing your own browser&apos;s site data or cookie consent — we will tell you this is the fastest option
          where it applies. For anything requiring us to act (for example, a complaint), we aim to acknowledge within
          7 days and resolve or substantively respond within <strong>30 days</strong>.
        </p>
        <p className="mt-2">
          <strong>Identity verification:</strong> because we hold no account system, we cannot verify identity via a
          login. For a request tied to something sent from a specific email address (e.g. a feedback-form
          submission, if a live version ever stores those server-side), we will ask you to confirm from that same
          email address before acting on the request, as a basic anti-impersonation check.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">11. Security</h2>
        <p className="mt-2">
          See the dedicated{" "}
          <Link href="/security" className="underline hover:text-[var(--color-teal)]">
            Security Information
          </Link>{" "}
          page for the technical and organizational measures in place.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">12. Children&apos;s privacy</h2>
        <p className="mt-2">
          Many scholarships listed on this site (for example, Pre-Matric schemes) are aimed at school-age children,
          including children well under 18. {SITE_NAME} itself does not knowingly collect personal data directly
          from children through its own forms — the optional dashboard and feedback fields described in Section 2
          are general-audience features whose data never leaves the submitter&apos;s own browser, and real
          applications for any listed scholarship are always submitted on the relevant government portal, typically
          by or with a parent, guardian or school, not through this site.{" "}
          <strong>
            Legal review flag: because this platform&apos;s content is directed in part at minors (even though
            personal-data collection is minimal), a qualified privacy lawyer should confirm whether India&apos;s
            DPDPA child/guardian-consent provisions, or children&apos;s-privacy laws in other jurisdictions where
            this site may be accessed, impose any additional obligation given the current, very limited data
            collected.
          </strong>{" "}
          If you believe a child has provided personal data to us in a way that concerns you, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--color-teal)] underline">
            {CONTACT_EMAIL}
          </a>{" "}
          and we will act on it.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">13. Changes to this policy</h2>
        <p className="mt-2">
          If what this site collects or does changes materially — for example, if analytics or advertising actually
          goes live, accounts or payments are added, or a feedback form starts sending data to a server — we will
          update this page and the &quot;Last updated&quot; date above, and reflect material changes affecting your
          rights in the cookie banner so you can re-confirm your choices. We intend to review this policy whenever a
          new feature, vendor, or legal requirement is introduced, and at least once a year regardless.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[var(--foreground)]">14. Related pages</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <Link href="/cookies" className="underline hover:text-[var(--color-teal)]">
              Cookie Policy
            </Link>
          </li>
          <li>
            <Link href="/security" className="underline hover:text-[var(--color-teal)]">
              Security Information
            </Link>
          </li>
          <li>
            <Link href="/terms" className="underline hover:text-[var(--color-teal)]">
              Terms of Use
            </Link>
          </li>
          <li>
            <Link href="/do-not-sell" className="underline hover:text-[var(--color-teal)]">
              Do Not Sell or Share My Personal Information
            </Link>
          </li>
          <li>
            <Link href="/disclaimer" className="underline hover:text-[var(--color-teal)]">
              Reservation and Eligibility Disclaimer
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
