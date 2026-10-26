import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/LegalPage";
import { ExportDataControls } from "@/components/ExportDataControls";
import { OPERATOR_DESCRIPTION, CONTACT_FALLBACK_NOTE, SITE_NAME, SITE_URL, REPO_URL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Nuqati",
  description: "What Nuqati collects, what it doesn't, and how to exercise your privacy rights.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          The short version: {SITE_NAME} has no backend server, no user accounts, and no payment
          processing. Everything you enter — the cards in your wallet, your points balances, any
          statement data you import — is stored only in your own browser&apos;s local storage, on
          your own device. We never receive, see, or store it ourselves, because there is nowhere
          for it to go. The rest of this page explains exactly what that means, category by
          category.
        </>
      }
    >
      <Section heading="1. Who operates this site">
        <p>
          {SITE_NAME} ({SITE_URL}) is a GCC credit card rewards comparison and optimization tool.
          {" "}
          {OPERATOR_DESCRIPTION}
        </p>
      </Section>

      <Section heading="2. What personal data we collect">
        <p>Going through every category a privacy policy is typically expected to cover:</p>
        <ul>
          <li>
            <strong>Account data:</strong> none. {SITE_NAME} has no sign-up, login, or user
            accounts of any kind.
          </li>
          <li>
            <strong>Contact details:</strong> none. There are no forms on the site that collect a
            name, email, or phone number — no newsletter sign-up, no contact form, no checkout.
          </li>
          <li>
            <strong>Payment data:</strong> none. {SITE_NAME} never asks for or processes card
            numbers, bank logins, or any payment credentials. It is a research and planning tool,
            not a banking integration.
          </li>
          <li>
            <strong>Financial/spending data you type in:</strong> card selections, loyalty-points
            balances, and transaction data you paste or upload in Statement Import are processed
            entirely by code running in your browser and saved only to that browser&apos;s local
            storage. None of it is transmitted to us, because {SITE_NAME} has no server to send it
            to.
          </li>
          <li>
            <strong>Device and usage data, IP address:</strong> we do not run analytics or
            tracking of any kind (see the{" "}
            <Link href="/cookies">Cookie Policy</Link>). The only device/IP information involved
            is what our hosting provider, Vercel, necessarily logs at the infrastructure level to
            serve pages and keep the site secure — standard web server access logs (IP address,
            user agent, requested URL, timestamp). We do not separately collect, store, or analyze
            this ourselves.
          </li>
          <li>
            <strong>Location data:</strong> none collected. {SITE_NAME} does not use geolocation
            APIs or ask for your location.
          </li>
          <li>
            <strong>Sensitive data:</strong> none collected by us in the legal sense (no
            government ID, biometric, health, or similar data is requested anywhere on the site).
          </li>
        </ul>
      </Section>

      <Section heading="3. How data is collected">
        <p>
          Not through forms, accounts, orders, or a newsletter — {SITE_NAME} has none of those.
          The only &ldquo;collection&rdquo; that happens is you directly interacting with the
          app: adding a card to your wallet, typing a points balance, or pasting/uploading a bank
          statement CSV for Statement Import. Each of those writes straight to your browser&apos;s
          local storage and nowhere else.
        </p>
      </Section>

      <Section heading="4. Legal basis for processing">
        <p>
          Because {SITE_NAME} does not process personal data on a server, most standard legal
          bases (contract performance, consent, legitimate interest) don&apos;t apply to us in the
          way they would for a typical account-based service. Where our hosting provider&apos;s
          infrastructure necessarily logs access data (see §2), the basis is our legitimate
          interest in operating, securing, and debugging the site, and compliance with legal
          obligations where applicable.
        </p>
      </Section>

      <Section heading="5. How data is used">
        <p>
          Everything you enter is used exclusively to power the features you&apos;re using in that
          moment — ranking your wallet&apos;s cards, valuing your points, analyzing an imported
          statement — on your own device. Nothing is used for marketing, profiling, advertising, or
          sold to anyone, because we never receive it in the first place.
        </p>
      </Section>

      <Section heading="6. Who we share data with">
        <ul>
          <li>
            <strong>Hosting:</strong> Vercel Inc. hosts this site and provides TLS/HTTPS, its edge
            network, and standard server access logs. See{" "}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
              Vercel&apos;s own privacy policy
            </a>{" "}
            for how they handle infrastructure-level data.
          </li>
          <li>
            <strong>Everyone else:</strong> no payment processors, analytics providers,
            advertising partners, email providers, or customer-support tools are integrated today.
            If that changes, this policy and the{" "}
            <Link href="/cookies">Cookie Policy</Link> will be updated first, and consent obtained
            where required.
          </li>
        </ul>
      </Section>

      <Section heading="7. We do not sell or share your data">
        <p>
          {SITE_NAME} does not sell personal data and does not share it for cross-context
          behavioral advertising, because it never collects any in a form that could be sold or
          shared in the first place. No opt-out mechanism (such as a &ldquo;Do Not Sell or Share My
          Personal Information&rdquo; link) is provided because there is nothing to opt out of
          today. If that ever changes, this policy will be updated and an opt-out mechanism added
          before any such sharing begins.
        </p>
      </Section>

      <Section heading="8. Data retention and deletion">
        <p>
          Data you enter stays in your browser&apos;s local storage for as long as you keep it
          there — {SITE_NAME} itself has no server-side retention period for it, because it is
          never stored server-side. You can clear it at any time: via your browser&apos;s own
          site-data settings, or using the controls below, which work directly against this
          device&apos;s storage.
        </p>
        <ExportDataControls />
        <p className="text-xs text-foreground/50">
          Infrastructure-level access logs (see §2) are retained per Vercel&apos;s own standard log
          retention practices, not a period we set.
        </p>
      </Section>

      <Section heading="9. International data transfers">
        <p>
          Because {SITE_NAME} does not transmit or store the data you enter on any server of ours,
          there is no cross-border transfer of that data by us. Vercel operates a global edge
          network and may process infrastructure-level request data (see §2) in multiple regions
          as part of serving the site; see their documentation for details. This is flagged as an
          area for legal review if {SITE_NAME} ever adds a backend, accounts, or analytics that
          would involve real cross-border transfers of personal data.
        </p>
      </Section>

      <Section heading="10. Your privacy rights">
        <p>
          Wherever you are, you generally have the right to access, correct, delete, and port your
          data, object to or restrict its processing, withdraw consent, and lodge a complaint with
          your local data protection authority. For {SITE_NAME} specifically, because your data
          lives only in your own browser:
        </p>
        <ul>
          <li>
            <strong>Access &amp; portability:</strong> use &ldquo;Export my data&rdquo; above to
            download everything stored for you, as JSON, instantly.
          </li>
          <li>
            <strong>Deletion:</strong> use &ldquo;Clear my data&rdquo; above, or clear this
            site&apos;s data from your browser settings — either takes effect immediately.
          </li>
          <li>
            <strong>Correction:</strong> edit any value directly in the app (e.g. remove a card,
            re-enter a balance) — there is no separate copy of it anywhere to also correct.
          </li>
          <li>
            <strong>Objection, restriction, withdrawal of consent:</strong> not applicable in
            practice, since no processing by us occurs to object to.
          </li>
          <li>
            <strong>Complaints:</strong> you can lodge a complaint with your local data protection
            authority at any time. For Bahrain, that is the Personal Data Protection Authority
            (PDPA); for Saudi Arabia, the Saudi Data &amp; AI Authority (SDAIA) — see §11.
          </li>
        </ul>
      </Section>

      <Section heading="11. Saudi Arabia — PDPL">
        <p>
          {SITE_NAME}&apos;s roadmap includes Saudi Arabia (marked &ldquo;coming soon&rdquo; in
          Explore Benefits today), so this section addresses Saudi Arabia&apos;s{" "}
          <strong>Personal Data Protection Law</strong> (PDPL — Royal Decree M/19/2021, as amended
          by Royal Decree M/148/2023), enforced by the Saudi Data &amp; AI Authority (SDAIA), in
          force since 14 September 2023 with full enforcement from 14 September 2024.
        </p>
        <ul>
          <li>
            PDPL gives data subjects the right to be informed, to access their data, to request
            correction, to request destruction/deletion, to withdraw consent, to object to
            processing that causes harm, to data portability, and to lodge a complaint with SDAIA.
          </li>
          <li>
            Because {SITE_NAME} processes no personal data on a server and has no operations or
            commercial presence in Saudi Arabia yet, controller-level PDPL obligations — SDAIA
            registration, Data Protection Officer appointment thresholds, formal cross-border
            transfer assessments — do not currently apply in practice.
          </li>
          <li>
            This assessment should be revisited by qualified Saudi counsel before any commercial
            launch in Saudi Arabia, particularly if accounts, a backend, or analytics are added.
          </li>
        </ul>
      </Section>

      <Section heading="12. How to submit a privacy request">
        <p>
          Because {SITE_NAME} holds no accounts, there is no identity to verify for the self-serve
          export/delete tools above — they act directly on your device&apos;s own storage. For any
          other privacy question or request, {CONTACT_FALLBACK_NOTE} We aim to respond within 30
          days as a best-effort target, though no formal service-level agreement exists yet for
          what is currently a personal project.
        </p>
      </Section>

      <Section heading="13. Privacy team / Data Protection Officer">
        <p>
          No dedicated privacy team or Data Protection Officer has been appointed — {SITE_NAME} is
          not currently of a scale that requires one under GDPR, PDPL, or similar thresholds. This
          should be reassessed if {SITE_NAME} becomes a registered commercial product handling
          data at scale.
        </p>
      </Section>

      <Section heading="14. Changes to this policy">
        <p>
          Material changes to this policy will update the &ldquo;Last updated&rdquo; date at the
          top of this page. Since {SITE_NAME} has no account system or mailing list, there is no
          way to notify individual users directly today; the dated page itself, and the public
          commit history at{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            the project&apos;s GitHub repository
          </a>
          , are the record of what changed and when.
        </p>
      </Section>
    </LegalPage>
  );
}
