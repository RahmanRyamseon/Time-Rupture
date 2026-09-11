import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & Data Policy",
  description: "How EduRozgar India handles personal information, and what it deliberately does not collect.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Privacy &amp; Data Policy</h1>

      <h2 className="mt-6 text-lg font-bold text-[var(--foreground)]">What we do not collect</h2>
      <p className="mt-2">
        EduRozgar India does not ask for your religion or other sensitive personal information as a condition of
        using the search, filters, or dashboard. Where any listing&apos;s official scheme genuinely requires a
        community or category certificate, that requirement comes from the official notification — you provide such
        documents directly to the government authority processing your application, not to EduRozgar India.
      </p>

      <h2 className="mt-6 text-lg font-bold text-[var(--foreground)]">What the dashboard stores, and where</h2>
      <p className="mt-2">
        Saved opportunities, alert preferences and application-status tracking on the &quot;My Dashboard&quot; page
        are stored in your browser&apos;s local storage in this demo build. This data is not transmitted to
        EduRozgar India&apos;s servers and is not visible to us. Registration (email or mobile) is optional and is
        used only to enable alert delivery once a backend notification service is connected.
      </p>

      <h2 className="mt-6 text-lg font-bold text-[var(--foreground)]">Your controls</h2>
      <p className="mt-2">
        You can clear all locally stored dashboard data at any time from the &quot;Delete my dashboard data&quot;
        control on the dashboard page, or by clearing your browser&apos;s site data for this domain.
      </p>

      <h2 className="mt-6 text-lg font-bold text-[var(--foreground)]">Third-party / official links</h2>
      <p className="mt-2">
        Clicking &quot;Apply on Official Website&quot; or &quot;View Official Notification&quot; takes you to an
        external, official website not operated by EduRozgar India. That website&apos;s own privacy policy applies
        to any information you submit there.
      </p>
    </div>
  );
}
