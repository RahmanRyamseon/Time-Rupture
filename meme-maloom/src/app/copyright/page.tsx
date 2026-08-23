import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Copyright & Takedown Policy",
  description:
    "How Meme Maloom handles attribution, source linking and takedown requests for third-party content.",
};

export default function CopyrightPage() {
  return (
    <LegalPage
      eyebrow="Rights & attribution"
      title="Copyright & Takedown Policy"
      updated="10 August 2026"
    >
      <p>
        Memes almost always originate from someone else&apos;s creative work —
        a film, a show, a photo, a joke a stranger tweeted. Meme Maloom&apos;s
        job is to explain that work&apos;s cultural life, not to claim it.
      </p>
      <h2>How we handle media</h2>
      <ul>
        <li>We do not download or permanently reproduce third-party images, video or audio by default.</li>
        <li>Meme detail pages show clearly labelled placeholder media alongside a link to the original source.</li>
        <li>Explanatory text (origin, context, translation) is original commentary written or reviewed by Meme Maloom contributors.</li>
        <li>Where a creator is known, they are credited directly on the meme&apos;s detail page.</li>
      </ul>
      <h2>Requesting a takedown or correction</h2>
      <p>
        If you&apos;re the rights holder or original creator of content
        referenced on Meme Maloom and want it removed, corrected, or
        attributed differently, you can:
      </p>
      <ul>
        <li>Use the &ldquo;Report or request removal&rdquo; button on the relevant meme&apos;s detail page, or</li>
        <li>
          Contact us directly via the{" "}
          <Link href="/contact" className="font-semibold text-saffron-600 underline">
            Contact page
          </Link>{" "}
          with a link to the entry and a description of your request.
        </li>
      </ul>
      <p>
        We aim to review takedown and correction requests within 5 business
        days. While a request is under review, the entry&apos;s copyright
        status is marked &ldquo;under review&rdquo; or &ldquo;takedown
        requested&rdquo; on its detail page.
      </p>
      <h2>Fair use & commentary</h2>
      <p>
        Where we describe or quote a meme&apos;s dialogue or caption text, it&apos;s
        done in the context of explanatory commentary — similar to how a
        film review might quote a line of dialogue — not to republish the
        underlying work itself.
      </p>
      <h2>Repeat submissions</h2>
      <p>
        Users who repeatedly submit content without appropriate rights or
        attribution may have their submission privileges suspended.
      </p>
    </LegalPage>
  );
}
