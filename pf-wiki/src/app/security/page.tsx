import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { CONTACT_EMAIL, SECURITY_LAST_UPDATED } from "@/lib/legal";

const title = "Security Information";
const description = `The technical and organizational measures ${SITE_NAME} relies on, and how to report a security issue.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/security/" },
  openGraph: {
    type: "website",
    url: "/security/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
};

export default function SecurityPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/security/` },
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
        / <span aria-current="page">Security Information</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Information</h1>
        <p className="mt-1 text-sm text-foreground/50">Last updated: {SECURITY_LAST_UPDATED}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">What there is to protect</h2>
        <p className="text-foreground/80">
          {SITE_NAME} is a static, read-only reference site: no accounts, no passwords, no
          payments, and no database of personal information. This significantly limits the attack
          surface compared to a typical web application — there is no login system to breach and
          no stored user records to leak, because none exist.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Technical measures in place</h2>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>
            <strong>HTTPS/TLS everywhere.</strong> All traffic to {SITE_URL} is served over HTTPS;
            our hosting provider (Vercel) automatically provisions and renews TLS certificates and
            redirects plain HTTP requests to HTTPS.
          </li>
          <li>
            <strong>Static output, no server-side application code.</strong> The site is built as
            pre-rendered static files with no server-side database, user input processing, or
            dynamic backend — eliminating entire classes of risk like SQL injection or server-side
            request forgery that affect typical dynamic applications.
          </li>
          <li>
            <strong>No credentials to steal.</strong> There is nothing to log into on this site, so
            there are no site passwords, sessions, or admin panels exposed to the public internet
            for attackers to target.
          </li>
          <li>
            <strong>Managed hosting infrastructure.</strong> Vercel operates the CDN, edge network,
            and build pipeline, and maintains its own security practices (DDoS mitigation, access
            controls, monitoring) at the platform level — see Vercel&apos;s own security
            documentation for specifics of their infrastructure.
          </li>
          <li>
            <strong>Source control and build process.</strong> The site&apos;s code is version
            controlled, and every deployment is built fresh from that source — reducing the chance
            of unreviewed or tampered code reaching production.
          </li>
          <li>
            <strong>Minimal third-party scripts.</strong> Google Analytics and Google AdSense
            scripts, the only third-party code on the site, load only after you explicitly consent
            — see the{" "}
            <Link href="/cookies/" className="underline hover:text-foreground">
              Cookie Policy
            </Link>
            .
          </li>
        </ul>
        <p className="text-foreground/80">
          No online system is completely immune to failure, and we can&apos;t guarantee absolute
          security — but given the site&apos;s static, account-less design, the realistic risk to
          any individual visitor&apos;s personal data from this site specifically is low.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">If something ever goes wrong</h2>
        <p className="text-foreground/80">
          Because there&apos;s no database of personal data to breach, a &quot;data breach&quot; in
          the traditional sense is unlikely to occur here. If we ever become aware of a security
          issue that could affect visitors — for example, a compromise of the site&apos;s source
          repository or hosting account — we will:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>contain it as quickly as possible (e.g. revoking access, rolling back a deployment);</li>
          <li>investigate what happened and what, if anything, was affected;</li>
          <li>
            notify the Data Protection Board of India and/or affected individuals where legally
            required to do so under the DPDPA 2023 or other applicable law;
          </li>
          <li>post a notice on this page describing what happened and what we did about it.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Staying safe as a visitor</h2>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>
            {SITE_NAME} will never ask for your UAN password, Aadhaar OTP, bank details, or any
            EPFO login credentials. If anything claiming to be from {SITE_NAME} asks for these,
            it&apos;s not us — don&apos;t provide them.
          </li>
          <li>
            Always do real PF transactions only on EPFO&apos;s own official portals — see our{" "}
            <Link href="/official-links/" className="underline hover:text-foreground">
              Official EPFO Links
            </Link>{" "}
            page for verified destinations.
          </li>
          <li>
            Be wary of phishing messages (SMS, WhatsApp, email) claiming to be EPFO — EPFO does not
            ask for OTPs or passwords over these channels.
          </li>
          <li>Use a password manager and enable two-factor authentication on your real UAN/EPFO account.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Report a security issue</h2>
        <p className="text-foreground/80">
          If you believe you&apos;ve found a security vulnerability affecting this site (not EPFO
          itself — report those to EPFO directly), email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-strong hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          with details. Please report responsibly: give us a reasonable chance to fix an issue
          before disclosing it publicly, and don&apos;t access or modify data that isn&apos;t
          yours while testing.
        </p>
      </section>
    </div>
  );
}
