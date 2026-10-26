import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/LegalPage";
import { SITE_NAME, CONTACT_FALLBACK_NOTE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy — Nuqati",
  description: "What cookies and storage Nuqati uses — short answer: no cookies at all.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <>
          {SITE_NAME} sets <strong>zero cookies</strong> today — no essential, functional,
          analytics, performance, or advertising cookies of any kind, first-party or third-party.
          The one thing that resembles storage is your browser&apos;s local storage, used solely
          to remember your own wallet selections and inputs on your own device.
        </>
      }
    >
      <Section heading="1. Cookies we use">
        <p>
          None. We don&apos;t run analytics, advertising, or any other script that sets a cookie.
          If you inspect this site&apos;s cookies in your browser&apos;s developer tools, the list
          should be empty.
        </p>
      </Section>

      <Section heading="2. What local storage is used for instead">
        <p>
          Local storage is not a cookie — it isn&apos;t sent to any server on every request, and
          nothing we don&apos;t control can read it. {SITE_NAME} uses it to remember, on your
          device only:
        </p>
        <ul>
          <li>The cards you&apos;ve added to your wallet</li>
          <li>Your logged swipes and monthly cap usage</li>
          <li>Your entered loyalty-points balances</li>
          <li>Any statement-import summaries you&apos;ve chosen to save</li>
        </ul>
        <p>
          This is strictly necessary for the app to function between visits — without it,
          you&apos;d have to re-add your cards every time you opened the site. Because it&apos;s
          not a tracking technology and isn&apos;t shared with anyone, it doesn&apos;t require the
          same consent treatment as a tracking cookie would.
        </p>
      </Section>

      <Section heading="3. Hosting-level cookies">
        <p>
          Our hosting provider, Vercel, does not set cookies on this site&apos;s standard pages by
          default. If that were ever to change — for example, if a security challenge or
          authentication feature were enabled at the infrastructure level — this policy would be
          updated to reflect it.
        </p>
      </Section>

      <Section heading="4. Third-party cookies">
        <p>None. No analytics provider, advertising network, or embedded third-party widget is integrated into this site.</p>
      </Section>

      <Section heading="5. Why there's no cookie consent banner">
        <p>
          A real cookie consent banner exists to let you accept, reject, or customize{" "}
          <em>non-essential</em> cookies before they&apos;re set. Since {SITE_NAME} sets none, a
          full accept/reject interface would have nothing real to control — it would be theater,
          not consent. Instead, a one-time notice on your first visit links to this page so you
          know where things stand; dismissing it doesn&apos;t change anything about what&apos;s
          collected, because nothing is.
        </p>
        <p>
          If {SITE_NAME} ever adds analytics or advertising cookies, they will not be loaded
          before you&apos;ve given consent through a proper consent manager, and this policy will
          be updated first to describe exactly what&apos;s added, by whom, and for how long.
        </p>
      </Section>

      <Section heading="6. Managing or clearing storage yourself">
        <p>
          You can clear {SITE_NAME}&apos;s local storage at any time through your browser&apos;s
          own site-data settings, or using the &ldquo;Clear my data&rdquo; control on the{" "}
          <Link href="/privacy">Privacy Policy</Link> page.
        </p>
      </Section>

      <Section heading="7. Questions">
        <p>{CONTACT_FALLBACK_NOTE}</p>
      </Section>
    </LegalPage>
  );
}
