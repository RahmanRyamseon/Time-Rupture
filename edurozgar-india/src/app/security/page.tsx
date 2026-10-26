import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { CONTACT_EMAIL, SECURITY_LAST_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Security Information",
  description: `The technical and organizational measures ${SITE_NAME} relies on, and how to report a security issue.`,
};

export default function SecurityPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Security Information", item: `${SITE_URL}/security` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }} />

      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Security Information</h1>
      <p className="mt-1 text-xs text-slate-500">Last updated: {SECURITY_LAST_UPDATED}</p>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">What there is to protect</h2>
        <p className="mt-2">
          {SITE_NAME} has no user accounts, no logins for visitors, and no payments. The main data worth protecting
          is the public opportunity-listings database and the internal review/audit records used to keep it
          accurate — not personal data about visitors, since (per our{" "}
          <Link href="/privacy" className="underline hover:text-[var(--color-teal)]">
            Privacy Policy
          </Link>
          ) we hold very little of that.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Technical measures in place</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>HTTPS/TLS everywhere.</strong> All traffic to {SITE_URL} is served over HTTPS; our hosting
            provider (Vercel) automatically provisions and renews TLS certificates and redirects plain HTTP
            requests to HTTPS.
          </li>
          <li>
            <strong>Encryption at rest.</strong> The opportunity-listings database runs on Supabase-managed
            PostgreSQL, which encrypts data at rest at the infrastructure level per Supabase&apos;s own published
            practices.
          </li>
          <li>
            <strong>Access controls on the database.</strong> Row Level Security (RLS) policies restrict the public
            to read-only access to the opportunity-listings table. Writes to the content-moderation and audit
            tables require a separate, server-held service credential that is never exposed to the browser.
          </li>
          <li>
            <strong>Admin access — current limitation, stated honestly.</strong> The admin panel&apos;s review-queue
            API is currently protected by a server-side shared-secret header check, not a full account system with
            multi-factor authentication. This is a deliberate, documented stopgap for a small, low-stakes admin
            surface rather than a claim of enterprise-grade admin authentication — see the project README. Moving
            this to a real authenticated admin account with MFA is a known improvement, not yet implemented.
          </li>
          <li>
            <strong>Secrets management.</strong> API keys and the admin shared secret are stored as encrypted
            environment variables in our hosting provider&apos;s dashboard, never committed to source control.
          </li>
          <li>
            <strong>Secure development practices.</strong> The codebase is TypeScript with linting enforced, changes
            go through version control, and every production deployment is built fresh from that reviewed source —
            reducing the risk of unreviewed or tampered code reaching production.
          </li>
          <li>
            <strong>Logging and monitoring.</strong> An internal audit log records moderation actions (e.g. a
            listing being marked re-verified or archived), and a scheduled automated job logs a run summary each
            time it checks official sources for changes. Vercel and Supabase also provide their own
            platform-level logs and health advisories, which we periodically review.
          </li>
          <li>
            <strong>Firewalls and network protections.</strong> We rely on Vercel&apos;s and Supabase&apos;s
            platform-level network protections (including DDoS mitigation) rather than operating our own servers or
            firewalls — see each provider&apos;s own security documentation for specifics of their infrastructure.
          </li>
          <li>
            <strong>Backups.</strong> The database is hosted on Supabase, which provides automated backups as part
            of its managed service; the exact retention window depends on the project&apos;s plan tier at
            Supabase&apos;s own published policy, which we have not independently re-stated here to avoid overclaiming
            a specific number.
          </li>
          <li>
            <strong>Vulnerability management.</strong> We keep dependencies reasonably up to date and review
            dependency advisories, but have not commissioned a formal third-party penetration test. If you find a
            genuine vulnerability, please tell us (see below) rather than disclosing it publicly first.
          </li>
          <li>
            <strong>Minimal third-party scripts.</strong> No analytics or advertising scripts run today; if either
            is enabled later, it will load only after you consent — see the{" "}
            <Link href="/cookies" className="underline hover:text-[var(--color-teal)]">
              Cookie Policy
            </Link>
            .
          </li>
        </ul>
        <p className="mt-3">
          No online system is completely immune to failure, and we cannot guarantee absolute security — but given
          the site&apos;s minimal personal-data footprint and read-only public surface, the realistic risk to any
          individual visitor&apos;s personal data from this site specifically is low.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">If something ever goes wrong</h2>
        <p className="mt-2">
          Because we hold very little personal data (Section 2 of the{" "}
          <Link href="/privacy" className="underline hover:text-[var(--color-teal)]">
            Privacy Policy
          </Link>
          ), a &quot;data breach&quot; affecting individuals is unlikely but not impossible — for example, if the
          source repository, hosting account, or admin credential were ever compromised. If we become aware of a
          security issue that could affect visitors, we will:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>contain it as quickly as possible (e.g. revoking the exposed credential, rolling back a deployment);</li>
          <li>investigate what happened and what, if anything, was actually affected;</li>
          <li>
            notify the Data Protection Board of India and/or affected individuals where legally required under the
            DPDPA 2023 or other applicable law — <strong>legal review flag: the exact notification thresholds and
            timelines under the DPDPA, and under any other law that may apply, should be confirmed by a qualified
            privacy lawyer rather than assumed from this general statement</strong>;
          </li>
          <li>post a notice on this page describing what happened and what we did about it.</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Staying safe as a user</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            {SITE_NAME} will never ask for your bank details, Aadhaar OTP, or login credentials for any government
            portal. If anything claiming to be from {SITE_NAME} asks for these, it is not us — do not provide them.
          </li>
          <li>Use a strong, unique password and a password manager for any real account you create on an official government or institutional portal.</li>
          <li>Be wary of phishing messages (SMS, WhatsApp, email) claiming urgent scholarship/admission action is needed — always navigate to the official portal directly rather than clicking a link in an unsolicited message.</li>
          <li>Enable multi-factor authentication wherever an official portal you use offers it.</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Report a security issue</h2>
        <p className="mt-2">
          If you believe you have found a security vulnerability affecting this site, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--color-teal)] underline">
            {CONTACT_EMAIL}
          </a>{" "}
          with details. Please report responsibly: give us a reasonable chance to fix an issue before disclosing it
          publicly, and don&apos;t access or modify data that isn&apos;t yours while testing.
        </p>
      </section>
    </div>
  );
}
