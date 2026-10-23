// Core data model for EduRozgar India opportunities.
// Field names intentionally mirror the structured database schema
// so mock data, UI, and any future backend line up 1:1.

export type OpportunityType =
  | "scholarship"
  | "government_job"
  | "admission"
  | "fellowship"
  | "skill_development";

export type ProviderType =
  | "central_government"
  | "state_government"
  | "public_sector"
  | "university"
  | "college"
  | "minority_welfare_department"
  | "trust_foundation"
  | "ngo"
  | "private_institution";

export type ApplicationMethod = "online" | "offline" | "online_and_offline";

export type OpportunityStatus =
  | "open"
  | "closing_soon"
  | "closed"
  | "coming_soon"
  | "result_disbursement_stage";

// Eligibility must always be traceable to an official notification.
// "not_stated" is the default — absence of a field is never treated as exclusion or inclusion.
export type EligibilityFlag = "explicitly_eligible" | "not_stated" | "explicitly_not_eligible";

export interface MinorityEligibility {
  flag: EligibilityFlag;
  /** Exact wording copied from the official notification, if any. */
  sourceWording?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  opportunity_type: OpportunityType;
  sub_type: string;
  provider_name: string;
  provider_type: ProviderType;
  description: string;
  state: string; // "All India" for national opportunities
  district?: string;
  location: string;
  education_level: string[];
  course_or_post?: string;
  qualification: string;
  subject?: string;
  gender_eligibility: "all" | "women_only" | "men_only";
  minority_eligibility: MinorityEligibility;
  muslim_eligibility: MinorityEligibility;
  other_category_eligibility: string[]; // e.g. SC, ST, OBC, EWS, PwD
  income_limit?: string;
  minimum_marks?: string;
  age_minimum?: number;
  age_maximum?: number;
  age_relaxation?: string;
  vacancies?: number;
  salary_or_benefit?: string;
  scholarship_amount?: string;
  application_fee?: string;
  opening_date: string; // ISO date
  closing_date: string; // ISO date
  correction_deadline?: string;
  exam_date?: string;
  admit_card_date?: string;
  result_date?: string;
  selection_process?: string;
  required_documents: string[];
  official_notification_url: string;
  official_application_url: string;
  official_source_domain: string;
  application_method: ApplicationMethod;
  status: OpportunityStatus;
  last_verified_date: string;
  next_verification_date: string;
  source_excerpt?: string;
  editor_notes?: string;
  created_at: string;
  updated_at: string;
  // Flags used only for filtering copy — never implies guaranteed benefit.
  no_application_fee: boolean;
  disability_eligible: boolean;
  first_generation_learner_priority: boolean;
  rural_ews_priority: boolean;
}

export interface Article {
  slug: string;
  title: string;
  summary: string;
  body: string[]; // paragraphs
  category: string;
  published_date: string;
}

export interface CalendarEvent {
  opportunityId: string;
  title: string;
  opportunity_type: OpportunityType;
  eventType:
    | "opening_date"
    | "closing_date"
    | "correction_deadline"
    | "exam_date"
    | "admit_card_date"
    | "result_date";
  date: string;
  state: string;
  education_level: string[];
}
