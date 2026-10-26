import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { CONTACT_EMAIL, TERMS_LAST_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms for using ${SITE_NAME}.`,
};

export default function TermsPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Terms of Use", item: `${SITE_URL}/terms` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd) }} />

      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Terms of Use</h1>
      <p className="mt-1 text-xs text-slate-500">Last updated: {TERMS_LAST_UPDATED}</p>

      <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <strong>{SITE_NAME} is not a government website.</strong> It is not operated by, affiliated with, or
        endorsed by the Government of India, any state government, or any recruiting, examination or educational
        authority. It does not process applications, payments or documents on anyone&apos;s behalf — every
        application must be completed on the official portal linked from each listing. See the full{" "}
        <Link href="/disclaimer" className="underline">
          Reservation and Eligibility Disclaimer
        </Link>
        .
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">1. Acceptance of terms</h2>
        <p className="mt-2">By using {SITE_URL}, you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">2. No professional or legal advice</h2>
        <p className="mt-2">
          Content on {SITE_NAME} is for general informational purposes only. It is not legal, financial, or
          immigration/eligibility advice, and is not a substitute for reading the official notification for any
          scheme or consulting a qualified professional about your specific situation. Eligibility rules, deadlines
          and procedures change over time and vary by scheme, institution and state.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">3. Accuracy and sourcing</h2>
        <p className="mt-2">
          Each listing records its official notification link, official application link, the date it was last
          verified, and, where relevant, the exact eligibility wording copied from the source. We make a good-faith
          effort to keep listings accurate and current, including an automated daily check against official sources
          whose results are reviewed by a person before anything changes — but official processes can change without
          notice, and we cannot guarantee that every listing is current at the moment you read it. Always verify
          against the linked official source before relying on any detail, especially dates and eligibility.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">4. No liability, no guarantee of outcome</h2>
        <p className="mt-2">
          {SITE_NAME} is provided &quot;as is&quot;, without warranties of any kind, express or implied. We do not
          guarantee selection, admission, scholarship disbursement, or any other outcome, and are not liable for any
          loss or damage arising from your use of, or reliance on, information on this site. Use your judgment, and
          confirm anything consequential — deadlines, eligibility, required documents — with the official source
          before acting on it.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">5. Third-party links</h2>
        <p className="mt-2">
          This site links to official government, institutional and examination-body websites for every listing. We
          do not control these external sites and are not responsible for their content, availability, or
          practices — including what information they themselves collect from you once you leave {SITE_NAME}.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">6. Acceptable use</h2>
        <p className="mt-2">
          Don&apos;t use this site to submit false reports or suggestions, attempt to access the admin panel without
          authorization, scrape the site at a rate that degrades it for others, or use it for any unlawful purpose.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">7. Intellectual property</h2>
        <p className="mt-2">
          Original written content on {SITE_NAME} (summaries, guidance articles, categorisation) may be reused for
          personal, non-commercial reference purposes with attribution back to {SITE_URL}. Quoted official wording
          remains the property of its original source and is linked back to that source wherever possible.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">8. Governing law</h2>
        <p className="mt-2">
          These terms are governed by the laws of India, without regard to conflict-of-law principles. This is a
          general statement appropriate for a small informational site, not a jurisdiction clause drafted for
          litigation — if enforceable terms are needed for a commercial product, have a lawyer draft them for that
          specific situation.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">9. Changes</h2>
        <p className="mt-2">
          We may update these terms as the site evolves. The &quot;Last updated&quot; date above reflects the most
          recent revision.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">10. Contact</h2>
        <p className="mt-2">
          Questions about these terms:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[var(--color-teal)] underline">
            {CONTACT_EMAIL}
          </a>
          . See also our{" "}
          <Link href="/privacy" className="underline hover:text-[var(--color-teal)]">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/security" className="underline hover:text-[var(--color-teal)]">
            Security Information
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
