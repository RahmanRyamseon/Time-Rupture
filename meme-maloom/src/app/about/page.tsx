import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "About Meme Maloom",
  description:
    "Meme Maloom is a Pan-India meme discovery and cultural-explanation platform. Learn what we do and why.",
};

export default function AboutPage() {
  return (
    <LegalPage eyebrow="Our story" title="About Meme Maloom" updated="10 August 2026">
      <p>
        Meme Maloom exists because most memes travel faster than their
        context. A phrase from a 1975 film, a Telugu flex line, a Bengali
        sarcastic sign-off — they all show up in your feed with zero
        explanation, and if you didn&apos;t grow up with the reference, you&apos;re
        left guessing.
      </p>
      <p>
        We&apos;re a cultural archive, a trend-discovery platform and a
        translation layer, all at once — built for Indian Gen Z and
        millennials who grew up with these memes, and for anyone else
        (students, marketers, researchers, or just the culturally curious)
        who wants to actually understand them.
      </p>
      <h2>What we do</h2>
      <ul>
        <li>Explain the origin, language and cultural context behind Indian memes.</li>
        <li>Cover all major Indian languages and regions — not just Hindi-belt content.</li>
        <li>Link to original sources instead of rehosting third-party media.</li>
        <li>Track how formats evolve, spread and get remixed across languages.</li>
      </ul>
      <h2>What we&apos;re not</h2>
      <p>
        Meme Maloom is an independent platform. We are not affiliated with,
        endorsed by, or sponsored by Reddit, Instagram, YouTube, Know Your
        Meme, or any other platform referenced on this site. We&apos;re also not
        a meme reposting site — if you&apos;re here just for the images, you&apos;re
        in the wrong place. We&apos;re here for the &ldquo;why.&rdquo;
      </p>
      <h2>A note on this prototype</h2>
      <p>
        This build is a frontend prototype with realistic sample data. No
        third-party images are scraped or mirrored; media is shown as
        clearly labelled placeholders with source-link cards. A production
        version would connect this interface to a moderated submission
        pipeline and licensed or user-generated media.
      </p>
    </LegalPage>
  );
}
