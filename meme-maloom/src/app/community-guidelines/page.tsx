import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "Meme Maloom's community guidelines for submissions, comments and cultural explanations.",
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalPage
      eyebrow="Keeping it welcoming"
      title="Community Guidelines"
      updated="10 August 2026"
    >
      <p>
        Meme Maloom is meant to be a welcoming space for every Indian
        language and community — not just the loudest ones online. These
        guidelines apply to meme submissions, explanations, and any
        comments or reports you send us.
      </p>
      <h2>Do</h2>
      <ul>
        <li>Submit memes with accurate language, region and category tags.</li>
        <li>Add real cultural context — the more specific, the better.</li>
        <li>Credit original creators whenever you know who they are.</li>
        <li>Flag mistakes or missing context so we can fix them.</li>
        <li>Represent regional and minority-language communities respectfully.</li>
      </ul>
      <h2>Don&apos;t</h2>
      <ul>
        <li>Submit hate speech, harassment, or content targeting private individuals.</li>
        <li>Post caste-, religion-, or community-based slurs, even &ldquo;as a joke.&rdquo;</li>
        <li>Submit misinformation dressed up as a meme explanation.</li>
        <li>Upload copyrighted media you don&apos;t have the rights to share.</li>
        <li>Use the report tool to settle personal disputes or brigade a submission.</li>
      </ul>
      <h2>Moderation</h2>
      <p>
        Every submission is reviewed by an editor before publication. We may
        edit context for clarity or accuracy, ask a submitter for sources,
        or decline entries that don&apos;t meet these guidelines. Repeated
        violations can result in submission privileges being revoked.
      </p>
      <h2>Reporting content</h2>
      <p>
        Every meme detail page has a &ldquo;Report or request removal&rdquo;
        option. For copyright-specific requests, see our{" "}
        <a href="/copyright" className="font-semibold text-violet-700 underline">
          Copyright &amp; Takedown
        </a>{" "}
        page.
      </p>
    </LegalPage>
  );
}
