import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { SITE_NAME, REPO_URL, CONTACT_FALLBACK_NOTE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Security — Nuqati",
  description: "How Nuqati protects data, and how to report a security issue.",
};

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      intro={
        <>
          {SITE_NAME}&apos;s biggest security advantage is structural: there is no server-side
          database of user data to breach, because {SITE_NAME} doesn&apos;t have one. Here&apos;s
          what that means in practice, and what we do protect.
        </>
      }
    >
      <Section heading="1. Technical and organizational measures">
        <ul>
          <li>
            <strong>HTTPS/TLS everywhere.</strong> The site is served exclusively over HTTPS via
            our hosting provider, Vercel, which automatically provisions and renews TLS
            certificates for every deployment. There is no unencrypted HTTP endpoint.
          </li>
          <li>
            <strong>No server-side data store.</strong> The data you enter — wallet cards, points
            balances, imported statement data — is written only to your browser&apos;s local
            storage. There is no database, no API that receives it, and therefore nothing of
            yours stored on our infrastructure that could be exposed in a server-side breach.
          </li>
          <li>
            <strong>No accounts, no passwords.</strong> {SITE_NAME} has no login system, so there
            are no credentials of yours for us to store, hash, or leak.
          </li>
          <li>
            <strong>Static, source-controlled deployment.</strong> The site is built from source
            code in a version-controlled Git repository and deployed through Vercel&apos;s CI/CD
            pipeline — every change is tracked, reviewable, and attributable.
          </li>
          <li>
            <strong>Access controls.</strong> Access to the hosting account and source repository
            is restricted to the project&apos;s maintainer(s).
          </li>
        </ul>
        <p className="text-xs text-foreground/50">
          What this list doesn&apos;t yet include — encryption-at-rest for a database, MFA on
          administrative access, formal logging/monitoring/vulnerability-management programs — is
          because those protect infrastructure {SITE_NAME} doesn&apos;t currently have (a
          database, user accounts, background services). If and when any of that is added, this
          page will be updated to describe the real measures protecting it, not a boilerplate
          list.
        </p>
      </Section>

      <Section heading="2. No method is perfectly secure">
        <p>
          No online transmission or storage method is completely secure, and we can&apos;t
          guarantee absolute security. What we can say honestly is that {SITE_NAME}&apos;s design
          — keeping your data local to your own device rather than centralizing it on a server —
          removes an entire category of risk (a server-side breach exposing many users&apos; data
          at once) by construction, not by promise.
        </p>
      </Section>

      <Section heading="3. Data breach response">
        <p>
          Because there is no server-side store of user data today, there is currently no
          plausible scenario for a &ldquo;data breach&rdquo; in the conventional sense — there is
          nothing centrally stored to be breached. If {SITE_NAME} ever adds a backend, accounts,
          or any server-side storage of personal data, this page will be updated with a real
          incident-response process: containment, investigation, notification to affected
          individuals and regulators where legally required, and remediation — before that
          feature ships, not after.
        </p>
      </Section>

      <Section heading="4. Protecting yourself">
        <ul>
          <li>
            {SITE_NAME} will never ask for your bank login, card PIN, or CVV — if you ever see a
            page claiming to be Nuqati asking for those, it is not this site.
          </li>
          <li>
            Only enter statement data on the real site ({`gulfcards.vercel.app`}) — check the
            address bar before pasting anything sensitive.
          </li>
          <li>Keep your own device and browser up to date; your data&apos;s security depends on your device&apos;s, since that&apos;s where it lives.</li>
        </ul>
      </Section>

      <Section heading="5. Reporting a security issue">
        <p>
          If you find a security vulnerability in {SITE_NAME}, please report it responsibly rather
          than exploiting or publicly disclosing it first. {CONTACT_FALLBACK_NOTE} If the
          repository has GitHub&apos;s private security advisory feature enabled, that is
          preferable to a public issue for a genuine vulnerability — check the &ldquo;Security&rdquo;
          tab at{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            {REPO_URL}
          </a>
          . We&apos;ll acknowledge reports on a best-effort basis; no formal response-time SLA
          exists yet for what is currently a personal project.
        </p>
      </Section>
    </LegalPage>
  );
}
