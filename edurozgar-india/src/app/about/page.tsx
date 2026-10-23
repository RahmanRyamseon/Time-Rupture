import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About EduRozgar India",
  description:
    "EduRozgar India is an information and discovery platform for scholarships, government jobs and education opportunities in India — not a government website.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">About EduRozgar India</h1>
      <p className="mt-4">
        EduRozgar India helps students and job seekers across India discover scholarships, government jobs, college
        admissions, fellowships and skill-development programmes in one place, with clear deadlines, eligibility
        details and links to the official source for every listing.
      </p>
      <p className="mt-4">
        We particularly try to surface opportunities relevant to Muslim students, Muslim job seekers and other
        notified minority communities — but only where the official notification for that opportunity itself states
        this eligibility. See our{" "}
        <Link href="/disclaimer" className="font-semibold text-[var(--color-teal)] underline">
          Reservation and Eligibility Disclaimer
        </Link>{" "}
        for how we use these terms.
      </p>
      <h2 className="mt-8 text-lg font-bold text-[var(--foreground)]">What we are not</h2>
      <p className="mt-2">
        EduRozgar India is not a government website, is not affiliated with any government department, examination
        board, university, or recruiting authority, and does not process applications, payments or documents on
        anyone&apos;s behalf. Every application must be completed on the relevant official portal.
      </p>
      <h2 className="mt-8 text-lg font-bold text-[var(--foreground)]">How listings are verified</h2>
      <p className="mt-2">
        Each listing records its official notification link, official application link, the date it was last
        verified, and — where relevant — the exact eligibility wording copied from the source. Listings are
        prioritised from central and state government websites, the National Scholarship Portal, UPSC, SSC, Railway
        Recruitment Boards, State Public Service Commissions, Employment News, university/college websites and
        official minority welfare departments.
      </p>
      <p className="mt-2">
        This build is a demonstration of that structure using sample data — see the note on each listing for its
        verification status before treating it as current.
      </p>
    </div>
  );
}
