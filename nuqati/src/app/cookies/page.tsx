import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/LegalPage";
import { SITE_NAME, CONTACT_FALLBACK_NOTE } from "@/lib/legal";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";

export const metadata: Metadata = {
  title: "Cookie Policy — Nuqati",
  description: "What cookies Nuqati uses, and how to control them.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <>
          {SITE_NAME} sets no cookies by default. The app itself (your wallet, swipe log, and
          points balances) runs entirely on your browser&apos;s local storage, which isn&apos;t a
          cookie and needs no consent. Two optional cookie categories — analytics and advertising
          — exist in the code but are both off until you opt in, and currently do nothing
          regardless, since neither a Google Analytics nor a Google AdSense account is configured
          yet.
        </>
      }
    >
      <Section heading="1. Strictly necessary — not a cookie">
        <p>
          {SITE_NAME} uses browser local storage, not cookies, to remember on your device only:
        </p>
        <ul>
          <li>The cards you&apos;ve added to your wallet</li>
          <li>Your logged swipes and monthly cap usage</li>
          <li>Your entered loyalty-points balances</li>
          <li>Any statement-import summaries you&apos;ve chosen to save</li>
          <li>Your cookie preferences themselves (see below)</li>
        </ul>
        <p>
          This is required for the app to function between visits. It isn&apos;t sent to any
          server on every request and isn&apos;t shared with anyone, so it doesn&apos;t require
          the same consent treatment as a tracking cookie — it&apos;s always on and can&apos;t be
          disabled in the cookie banner, the same way it couldn&apos;t be turned off in your
          browser without breaking the app.
        </p>
      </Section>

      <Section heading="2. Optional: Analytics cookies">
        <p>
          The site has a Google Analytics integration wired in, gated behind an environment
          variable that currently isn&apos;t set. Until a GA4 property is configured, this
          category loads nothing no matter what you choose. Once it is, the script will still
          only load if you&apos;ve opted in — by accepting it in the banner, choosing it under
          &ldquo;Customize,&rdquo; or via &ldquo;Accept all.&rdquo;
        </p>
      </Section>

      <Section heading="3. Optional: Advertising cookies">
        <p>
          Likewise, the site has a Google AdSense integration wired in, gated behind a separate
          environment variable that also isn&apos;t set yet — no ad network is live today. When
          one is configured, ad cookies will still only load with your consent, the same way
          analytics does. This page will be updated with specifics (which ad network, what it
          sets) before that happens.
        </p>
      </Section>

      <Section heading="4. Hosting-level cookies">
        <p>
          Our hosting provider, Vercel, does not set cookies on this site&apos;s standard pages by
          default. If that were ever to change — for example, if a security challenge or
          authentication feature were enabled at the infrastructure level — this policy would be
          updated to reflect it.
        </p>
      </Section>

      <Section heading="5. Your choices">
        <p>
          A banner asks for your preference on first visit. You can change it at any time:
        </p>
        <p>
          <CookieSettingsButton className="font-medium text-brand-strong underline" />
        </p>
        <p>
          Your device also sends a <strong>Global Privacy Control</strong> signal automatically,
          if your browser supports it — Nuqati honors it as an opt-out of both optional
          categories, without showing the banner at all.
        </p>
      </Section>

      <Section heading="6. Managing or clearing storage yourself">
        <p>
          You can clear {SITE_NAME}&apos;s local storage (including your cookie preference) at
          any time through your browser&apos;s own site-data settings, or using the &ldquo;Clear
          my data&rdquo; control on the <Link href="/privacy">Privacy Policy</Link> page.
        </p>
      </Section>

      <Section heading="7. Questions">
        <p>{CONTACT_FALLBACK_NOTE}</p>
      </Section>
    </LegalPage>
  );
}
