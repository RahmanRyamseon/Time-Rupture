import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { CONTACT_EMAIL, TERMS_LAST_UPDATED } from "@/lib/legal";

const title = "Terms of Use & Disclaimer";
const description = `The terms for using ${SITE_NAME}, and an important disclaimer about its unofficial nature.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms/" },
  openGraph: {
    type: "website",
    url: "/terms/",
    title,
    description,
    siteName: SITE_NAME,
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
};

export default function TermsPage() {
  const breadcrumbListJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/terms/` },
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
        / <span aria-current="page">Terms of Use</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Terms of Use &amp; Disclaimer</h1>
        <p className="mt-1 text-sm text-foreground/50">Last updated: {TERMS_LAST_UPDATED}</p>
      </div>

      <div className="card-surface rounded-2xl p-5 text-sm text-foreground/80">
        <p>
          <strong>{SITE_NAME} is not EPFO.</strong> It is not affiliated with, endorsed by, or
          connected to the Employees&apos; Provident Fund Organisation, the Ministry of Labour and
          Employment, or the Government of India in any way. It does not process PF claims,
          withdrawals, transfers, or any other transaction — it only explains, in plain language,
          how real people have described and resolved common PF problems.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">1. Acceptance of terms</h2>
        <p className="text-foreground/80">
          By using {SITE_URL}, you agree to these terms. If you don&apos;t agree, please
          don&apos;t use the site.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">2. No professional or legal advice</h2>
        <p className="text-foreground/80">
          Content on {SITE_NAME} is for general informational purposes only. It is not financial,
          legal, tax, or professional advice, and should not be treated as a substitute for
          consulting EPFO directly, a chartered accountant, or a lawyer for your specific
          situation. PF rules, forms, and procedures change over time and can vary by region,
          employer, and individual circumstances.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">3. Accuracy and sourcing</h2>
        <p className="text-foreground/80">
          Entries on this site are sourced from publicly available community discussions (such as
          Reddit) and official EPFO material, and are periodically reviewed. We make a good-faith
          effort to keep information accurate and up to date, but EPFO&apos;s own processes can
          change without notice, and individual experiences people report may not generalize to
          your case. Always verify anything important against EPFO&apos;s official channels — see
          our{" "}
          <Link href="/official-links/" className="underline hover:text-foreground">
            Official EPFO Links
          </Link>{" "}
          page.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">4. No liability</h2>
        <p className="text-foreground/80">
          {SITE_NAME} is provided &quot;as is&quot;, without warranties of any kind, express or
          implied. To the fullest extent permitted by applicable law, we are not liable for any
          loss or damage arising from your use of, or reliance on, information on this site,
          including decisions made about your PF account based on content here. Use your
          judgment, and confirm anything consequential with EPFO or a qualified professional
          before acting on it.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">5. Third-party links</h2>
        <p className="text-foreground/80">
          This site links to official EPFO portals and, where relevant, to the community
          discussions a given entry is sourced from. We don&apos;t control these external sites
          and aren&apos;t responsible for their content, availability, or practices — including
          Google&apos;s own terms governing Analytics and AdSense.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">6. Intellectual property</h2>
        <p className="text-foreground/80">
          Original written content on {SITE_NAME} may be reused for personal, non-commercial
          reference purposes with attribution back to {SITE_URL}. Quoted community solutions
          remain the words of their original authors and are linked back to source wherever
          possible.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">7. Governing law</h2>
        <p className="text-foreground/80">
          These terms are governed by the laws of India, without regard to conflict-of-law
          principles. This is a general statement for a small informational site, not a
          jurisdiction clause drafted for litigation — if you need enforceable terms for a
          commercial product, have a lawyer draft them for your specific situation.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">8. Changes</h2>
        <p className="text-foreground/80">
          We may update these terms as the site evolves (for example, when advertising actually
          goes live). The &quot;Last updated&quot; date above reflects the most recent revision.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">9. Contact</h2>
        <p className="text-foreground/80">
          Questions about these terms:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-strong hover:underline">
            {CONTACT_EMAIL}
          </a>
          . See also our{" "}
          <Link href="/privacy/" className="underline hover:text-foreground">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/security/" className="underline hover:text-foreground">
            Security Information
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
