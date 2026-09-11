import { Opportunity, OpportunityStatus, OpportunityType } from "./types";

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export const STATUS_LABEL: Record<OpportunityStatus, string> = {
  open: "Open",
  closing_soon: "Closing Soon",
  closed: "Closed",
  coming_soon: "Coming Soon",
  result_disbursement_stage: "Result / Disbursement Stage",
};

export const STATUS_CLASSES: Record<OpportunityStatus, string> = {
  open: "bg-teal-100 text-teal-800 border-teal-300",
  closing_soon: "bg-amber-100 text-amber-800 border-amber-300",
  closed: "bg-gray-200 text-gray-700 border-gray-300",
  coming_soon: "bg-blue-100 text-blue-800 border-blue-300",
  result_disbursement_stage: "bg-purple-100 text-purple-800 border-purple-300",
};

export const TYPE_LABEL: Record<OpportunityType, string> = {
  scholarship: "Scholarship",
  government_job: "Government Job",
  admission: "College Admission",
  fellowship: "Fellowship",
  skill_development: "Skill Development",
};

export const TYPE_PATH: Record<OpportunityType, string> = {
  scholarship: "scholarships",
  government_job: "jobs",
  admission: "admissions",
  fellowship: "scholarships",
  skill_development: "scholarships",
};

/** Recomputes a live status from dates so demo data doesn't go stale silently. */
export function liveStatus(o: Opportunity): OpportunityStatus {
  const now = Date.now();
  const opens = new Date(o.opening_date).getTime();
  const closes = new Date(o.closing_date).getTime();
  if (o.status === "result_disbursement_stage") return o.status;
  if (now < opens) return "coming_soon";
  if (now > closes) return "closed";
  const days = daysUntil(o.closing_date);
  if (days <= 10) return "closing_soon";
  return "open";
}

export interface OpportunityFilters {
  query?: string;
  opportunity_type?: OpportunityType;
  state?: string;
  educationLevel?: string;
  minorityOnly?: boolean;
  muslimOnly?: boolean;
  womenOnly?: boolean;
  disabilityOnly?: boolean;
  noFeeOnly?: boolean;
  ruralEwsOnly?: boolean;
  firstGenOnly?: boolean;
  status?: OpportunityStatus;
}

export function filterOpportunities(list: Opportunity[], filters: OpportunityFilters): Opportunity[] {
  const q = filters.query?.trim().toLowerCase();
  return list.filter((o) => {
    if (filters.opportunity_type && o.opportunity_type !== filters.opportunity_type) return false;
    if (filters.state && filters.state !== "All India" && o.state !== filters.state && o.state !== "All India") return false;
    if (filters.educationLevel && !o.education_level.includes(filters.educationLevel)) return false;
    if (filters.minorityOnly && o.minority_eligibility.flag !== "explicitly_eligible") return false;
    if (filters.muslimOnly && o.muslim_eligibility.flag !== "explicitly_eligible") return false;
    if (filters.womenOnly && o.gender_eligibility !== "women_only") return false;
    if (filters.disabilityOnly && !o.disability_eligible) return false;
    if (filters.noFeeOnly && !o.no_application_fee) return false;
    if (filters.ruralEwsOnly && !o.rural_ews_priority) return false;
    if (filters.firstGenOnly && !o.first_generation_learner_priority) return false;
    if (filters.status && liveStatus(o) !== filters.status) return false;
    if (q) {
      const haystack = [
        o.title,
        o.provider_name,
        o.sub_type,
        o.state,
        o.qualification,
        o.course_or_post ?? "",
        ...o.education_level,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
