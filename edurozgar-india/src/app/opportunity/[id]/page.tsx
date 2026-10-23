import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllOpportunities, getOpportunityById } from "@/lib/opportunities-data";
import { formatDate, TYPE_LABEL, liveStatus, STATUS_LABEL } from "@/lib/helpers";
import StatusBadge from "@/components/StatusBadge";
import EligibilityBadges from "@/components/EligibilityBadges";
import ExternalLinkButton from "@/components/ExternalLinkButton";
import SaveOpportunityButton from "@/components/SaveOpportunityButton";
import FeedbackDialog from "@/components/FeedbackDialog";

export async function generateStaticParams() {
  const opportunities = await getAllOpportunities();
  return opportunities.map((o) => ({ id: o.id }));
}

// New opportunities added to Supabase after build still render (dynamicParams
// defaults to true); this just keeps already-built pages from going stale.
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/opportunity/[id]">): Promise<Metadata> {
  const { id } = await params;
  const o = await getOpportunityById(id);
  if (!o) return {};
  return {
    title: o.title,
    description: `${o.title} by ${o.provider_name}. ${TYPE_LABEL[o.opportunity_type]} for ${o.state}. Last date: ${formatDate(
      o.closing_date
    )}. Last verified ${formatDate(o.last_verified_date)}.`,
    alternates: { canonical: `/opportunity/${o.id}` },
  };
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="border-b border-[var(--color-border)] py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export default async function OpportunityDetailPage({ params }: PageProps<"/opportunity/[id]">) {
  const { id } = await params;
  const o = await getOpportunityById(id);
  if (!o) notFound();

  const checklist = [
    "Read the full official notification/prospectus linked below before you begin.",
    "Confirm you meet the qualification, age, income and domicile conditions stated in the notification.",
    ...o.required_documents.map((doc) => `Keep ready: ${doc}`),
    o.application_fee ? `Keep payment ready for the application fee: ${o.application_fee}` : "Check whether an application fee applies.",
    `Apply only through the official application link before ${formatDate(o.closing_date)}.`,
    "Save your application/registration number and download a copy of your submitted form.",
    o.correction_deadline ? `Use the correction window (until ${formatDate(o.correction_deadline)}) only to fix genuine errors.` : undefined,
  ].filter(Boolean) as string[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": o.opportunity_type === "government_job" ? "JobPosting" : "EducationalOccupationalProgram",
    name: o.title,
    description: o.description,
    provider: { "@type": "Organization", name: o.provider_name },
    datePosted: o.created_at,
    validThrough: o.closing_date,
    url: `https://edurozgar.example.in/opportunity/${o.id}`,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="mb-4 text-xs text-slate-500">
        <span>{TYPE_LABEL[o.opportunity_type]}</span> / <span>{o.state}</span>
      </nav>

      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge opportunity={o} />
          <span className="text-xs text-slate-500">
            {STATUS_LABEL[liveStatus(o)]} · Last verified {formatDate(o.last_verified_date)}
          </span>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{o.title}</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{o.provider_name}</p>
        <div className="mt-3">
          <EligibilityBadges opportunity={o} />
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-3">
        <ExternalLinkButton href={o.official_application_url} label="Apply on Official Website" variant="primary" trackId={o.id} />
        <ExternalLinkButton href={o.official_notification_url} label="View Official Notification" variant="secondary" />
        <SaveOpportunityButton id={o.id} />
      </div>

      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        You are being redirected to an external website when you click Apply or View Notification. Verify the URL and
        application details before submitting personal information or paying any fee.
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-bold">About this opportunity</h2>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{o.description}</p>
        {o.source_excerpt && (
          <blockquote className="mt-3 border-l-4 border-[var(--color-teal)] bg-teal-50 p-3 text-sm italic text-teal-900 dark:bg-teal-950/30 dark:text-teal-200">
            “{o.source_excerpt}”
          </blockquote>
        )}
      </section>

      {(o.muslim_eligibility.sourceWording || o.minority_eligibility.sourceWording) && (
        <section className="mb-8 rounded-lg border border-[var(--color-border)] p-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--color-navy)] dark:text-white">
            Muslim / Minority Eligibility — Exact Wording
          </h2>
          <p className="text-sm italic text-slate-700 dark:text-slate-300">
            “{o.muslim_eligibility.sourceWording ?? o.minority_eligibility.sourceWording}”
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Eligibility must be confirmed from the official notification. This is not a guarantee of reservation or
            selection.
          </p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Key details</h2>
        <dl className="grid gap-x-6 sm:grid-cols-2">
          <Field label="Sub-type" value={o.sub_type} />
          <Field label="Provider type" value={o.provider_type.replace(/_/g, " ")} />
          <Field label="Location" value={o.location} />
          <Field label="District" value={o.district} />
          <Field label="Education level" value={o.education_level.join(", ")} />
          <Field label="Course / Post" value={o.course_or_post} />
          <Field label="Qualification" value={o.qualification} />
          <Field label="Subject" value={o.subject} />
          <Field label="Gender eligibility" value={o.gender_eligibility.replace(/_/g, " ")} />
          <Field label="Other category eligibility" value={o.other_category_eligibility.join(", ") || "Not stated in source"} />
          <Field label="Income limit" value={o.income_limit} />
          <Field label="Minimum marks" value={o.minimum_marks} />
          <Field label="Age" value={o.age_minimum && o.age_maximum ? `${o.age_minimum}–${o.age_maximum} years` : undefined} />
          <Field label="Age relaxation" value={o.age_relaxation} />
          <Field label="Vacancies" value={o.vacancies} />
          <Field label="Salary / benefit" value={o.salary_or_benefit} />
          <Field label="Scholarship amount" value={o.scholarship_amount} />
          <Field label="Application fee" value={o.application_fee ?? (o.no_application_fee ? "No fee" : undefined)} />
          <Field label="Selection process" value={o.selection_process} />
          <Field label="Application method" value={o.application_method.replace(/_/g, " and ")} />
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Important dates</h2>
        <dl className="grid gap-x-6 sm:grid-cols-2">
          <Field label="Opening date" value={formatDate(o.opening_date)} />
          <Field label="Closing date" value={formatDate(o.closing_date)} />
          <Field label="Correction deadline" value={o.correction_deadline ? formatDate(o.correction_deadline) : undefined} />
          <Field label="Examination date" value={o.exam_date ? formatDate(o.exam_date) : undefined} />
          <Field label="Admit card date" value={o.admit_card_date ? formatDate(o.admit_card_date) : undefined} />
          <Field label="Result date" value={o.result_date ? formatDate(o.result_date) : undefined} />
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-bold">Application checklist</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
          {checklist.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mb-8 rounded-lg border border-[var(--color-border)] p-4 text-xs text-slate-500">
        <p>
          <strong>Official source:</strong> {o.official_source_domain}
        </p>
        <p className="mt-1">
          <strong>Last verified:</strong> {formatDate(o.last_verified_date)} · <strong>Next verification due:</strong>{" "}
          {formatDate(o.next_verification_date)}
        </p>
        {o.editor_notes && (
          <p className="mt-1">
            <strong>Editor notes:</strong> {o.editor_notes}
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <FeedbackDialog
          triggerLabel="Report outdated information"
          title="Report outdated information"
          description={`Let us know if any detail on "${o.title}" is incorrect or out of date.`}
          submissionType="report"
          opportunityId={o.id}
          opportunityTitle={o.title}
          fields={[
            { name: "issue", label: "What is outdated or incorrect?", type: "textarea", required: true },
            { name: "email", label: "Your email (optional)", type: "text" },
          ]}
        />
        <FeedbackDialog
          triggerLabel="Suggest an opportunity"
          title="Suggest an opportunity"
          description="Know a verified scholarship, job or admission we're missing? Share the official link."
          submissionType="suggestion"
          fields={[
            { name: "title", label: "Opportunity name", type: "text", required: true },
            { name: "url", label: "Official source URL", type: "url", required: true },
            { name: "notes", label: "Additional notes", type: "textarea" },
          ]}
        />
      </div>
    </div>
  );
}
