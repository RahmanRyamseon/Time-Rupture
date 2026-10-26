import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { SITE_NAME, OPERATOR_DESCRIPTION, CONTACT_FALLBACK_NOTE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service — Nuqati",
  description: "The terms for using Nuqati.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <>
          By using {SITE_NAME}, you agree to these terms. If you don&apos;t agree, please don&apos;t
          use the site.
        </>
      }
    >
      <Section heading="1. What Nuqati is">
        <p>
          {SITE_NAME} is a free, informational tool that helps GCC credit card holders compare
          card benefits and estimate rewards based on a curated, manually-maintained database of
          publicly available card terms. {OPERATOR_DESCRIPTION}
        </p>
      </Section>

      <Section heading="2. Not financial advice">
        <p>
          {SITE_NAME} does not provide financial, legal, or tax advice, and nothing on this site
          is a recommendation to apply for, use, or cancel any specific financial product. Card
          terms, rates, fees, and benefits change, and the data in {SITE_NAME} is manually curated
          and may be estimated, outdated, or incorrect — always verify current terms directly with
          the issuing bank before making a financial decision. See each card&apos;s
          &ldquo;last verified&rdquo; date and the in-app data disclaimer for more detail.
        </p>
      </Section>

      <Section heading="3. Eligibility">
        <p>
          {SITE_NAME} is intended for adults of legal age to hold a credit card in their
          jurisdiction (18 years or older in Bahrain and the wider GCC). It is not directed at or
          intended for use by children.
        </p>
      </Section>

      <Section heading="4. No warranty">
        <p>
          {SITE_NAME} is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
          warranties of any kind, express or implied, including accuracy, completeness, or
          fitness for a particular purpose. You use it, and any decisions you make based on it, at
          your own risk.
        </p>
      </Section>

      <Section heading="5. Limitation of liability">
        <p>
          To the fullest extent permitted by law, {SITE_NAME} and its operator(s) are not liable
          for any loss or damage arising from your use of, or inability to use, the site,
          including any financial decision made based on information shown here.
        </p>
      </Section>

      <Section heading="6. Your data stays with you">
        <p>
          As described in the <a href="/privacy">Privacy Policy</a>, {SITE_NAME} stores the data
          you enter only in your own browser&apos;s local storage. You&apos;re responsible for
          your own device&apos;s security, and for backing up (via the export tool on the Privacy
          Policy page) any data you don&apos;t want to lose if you clear your browser data.
        </p>
      </Section>

      <Section heading="7. Changes to the service or these terms">
        <p>
          {SITE_NAME} may be changed, suspended, or discontinued at any time without notice, since
          it is currently an independently operated personal project rather than a commercially
          supported service. Material changes to these terms will update the &ldquo;Last
          updated&rdquo; date at the top of this page.
        </p>
      </Section>

      <Section heading="8. Governing law">
        <p>
          Given {SITE_NAME}&apos;s current Bahrain-first focus, these terms are intended to be
          interpreted under the laws of the Kingdom of Bahrain, without regard to conflict-of-laws
          principles. This should be revisited and confirmed by qualified counsel if {SITE_NAME}{" "}
          becomes a registered commercial entity, especially one operating from or targeting
          another jurisdiction such as Saudi Arabia.
        </p>
      </Section>

      <Section heading="9. Contact">
        <p>{CONTACT_FALLBACK_NOTE}</p>
      </Section>
    </LegalPage>
  );
}
