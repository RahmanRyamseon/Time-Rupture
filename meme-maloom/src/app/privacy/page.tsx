import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Meme Maloom collects, uses and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Your data" title="Privacy Policy" updated="10 August 2026">
      <p>
        This is a prototype build of Meme Maloom. No accounts, submissions
        or newsletter sign-ups on this site are sent to a live backend —
        forms here simulate what a production version would do. This policy
        describes how a production version of Meme Maloom would handle your
        data.
      </p>
      <h2>Information we&apos;d collect</h2>
      <ul>
        <li>Newsletter sign-ups: your email address, used only to send the Maloom Digest.</li>
        <li>Meme submissions: title, description, source link, optional creator credit and any context you provide.</li>
        <li>Basic analytics: anonymised page views and interactions, used to power the Trending dashboard.</li>
        <li>Contact form messages: your name, email and message contents.</li>
      </ul>
      <h2>What we would not do</h2>
      <ul>
        <li>Sell your personal data to third parties.</li>
        <li>Require an account just to browse or search memes.</li>
        <li>Use submission data for anything other than reviewing and publishing meme entries.</li>
      </ul>
      <h2>Cookies</h2>
      <p>
        A production build would use essential cookies for functionality
        (like remembering filter preferences) and optional analytics
        cookies, which you&apos;d be able to opt out of via a cookie banner.
      </p>
      <h2>Your rights</h2>
      <p>
        You can request access to, correction of, or deletion of any
        personal data associated with your submissions or newsletter
        subscription by reaching out via the Contact page.
      </p>
      <h2>Third-party links</h2>
      <p>
        Meme detail pages link out to original sources on platforms like
        Instagram, YouTube, X and Reddit. Those platforms have their own
        privacy policies, which we encourage you to review.
      </p>
    </LegalPage>
  );
}
