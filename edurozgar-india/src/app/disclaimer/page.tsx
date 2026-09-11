import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservation and Eligibility Disclaimer",
  description:
    "Reservation, quota, fee concession, age relaxation and minority benefits differ by examination, institution, state and applicable law — read this before applying to any opportunity listed on EduRozgar India.",
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">Reservation and Eligibility Disclaimer</h1>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-medium text-amber-900">
          Reservation, quota, fee concession, age relaxation and minority benefits differ by examination,
          institution, state and applicable law. Muslim eligibility does not automatically mean that a fixed
          percentage of seats or government jobs is reserved. Users must read the current official notification and
          confirm eligibility before applying. This website provides information only and does not provide legal
          advice or guarantee selection.
        </p>

        <h2 className="text-lg font-bold text-[var(--color-navy)] dark:text-white">EduRozgar India is not a government website</h2>
        <p>
          EduRozgar India is an independent information and discovery platform. It is not operated by, affiliated
          with, or endorsed by the Government of India, any state government, or any recruiting, examination or
          educational authority. Every opportunity listed here must be verified on its own official application
          portal before you rely on it or apply.
        </p>

        <h2 className="text-lg font-bold text-[var(--color-navy)] dark:text-white">Key terms, used carefully</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Eligibility</strong> — the minimum conditions (age, qualification, income, domicile, etc.) a candidate must meet to be considered. Meeting eligibility never guarantees selection.</li>
          <li><strong>Reservation</strong> — a fixed proportion of seats or vacancies set aside by law or official policy for specific categories, exactly as stated in the relevant notification and applicable statute.</li>
          <li><strong>Relaxation</strong> — a concession on a specific parameter (commonly age or minimum marks) for defined categories, as specified in the official rules.</li>
          <li><strong>Preference</strong> — priority given to a group for a specific benefit where officially stated; distinct from a fixed statutory reservation.</li>
          <li><strong>Minority institution</strong> — an institution established and administered by a religious or linguistic minority under applicable law, whose own admission rules govern eligibility.</li>
          <li><strong>Income-based assistance</strong> — support extended based on defined income and merit criteria, not any single identity marker.</li>
          <li><strong>Merit-cum-means support</strong> — assistance combining academic merit with financial need, per the specific scheme&apos;s published criteria.</li>
          <li><strong>State-specific benefit</strong> — a benefit that applies only within a particular state, subject to that state&apos;s own rules and domicile requirements.</li>
          <li><strong>Officially notified category</strong> — a category (such as a minority community, SC, ST, OBC or EWS) that is formally notified by the relevant government authority as eligible for a specific benefit.</li>
        </ul>

        <h2 className="text-lg font-bold text-[var(--color-navy)] dark:text-white">Muslim/minority eligibility labelling</h2>
        <p>
          Where a listing shows &quot;Muslim/minority eligibility or preference where officially applicable&quot;, this
          means the specific official notification for that opportunity names Muslims or a notified minority
          community as an eligible group — not that every scholarship, job or admission carries such a benefit, and
          not that a fixed percentage is reserved for Muslims. EduRozgar India does not make that claim about any
          opportunity unless the official source itself states it.
        </p>

        <h2 className="text-lg font-bold text-[var(--color-navy)] dark:text-white">No guarantees</h2>
        <p>
          This website does not guarantee selection, admission, scholarship disbursement, or any outcome. It does
          not provide legal advice. Always apply through the official application portal linked from each listing,
          and never make any payment or share personal information based on this website alone.
        </p>
      </div>
    </div>
  );
}
