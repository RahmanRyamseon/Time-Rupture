/**
 * The evidence tag a case carries. These mirror the upstream list's tags
 * exactly — the whole point of the list is that "built with REA" is a claim,
 * not a fact, so the tag records what the evidence actually supports.
 */
export type EvidenceTag =
  | "REA"
  | "REA (partial)"
  | "AI-RE"
  | "Rebuild"
  | "Claim?"
  | "Manual RE";

export type Category = {
  slug: string;
  name: string;
  icon: string;
  description: string;
};

/** The upstream "Did it really use REA?" check for a single case. */
export type VerificationCheck = {
  readmeSaysRea: "yes" | "no" | "elsewhere" | "unknown";
  otherSource?: string;
  verdict: string;
  /** Short label for the verdict: Confirmed, Partial, Not confirmed, Not REA. */
  verdictLabel: "Confirmed" | "Partial" | "Not confirmed" | "Not REA";
};

export type CaseEntry = {
  slug: string;
  /** Repo or project name as the list gives it, e.g. "N0zoM1z0/dx-ball". */
  name: string;
  /** Display title — what a reader would call the thing. */
  title: string;
  url: string;
  category: string; // Category["slug"]
  tag: EvidenceTag;
  /** Where the tag comes from, when the list qualifies it (e.g. "author's post"). */
  tagSource?: string;
  summary: string;
  /** Extra sourced detail: caveats, measured figures, licensing notes. */
  notes?: string[];
  /** The app(s) this replaces or interoperates with, for the by-app index. */
  replaces?: string[];
  license?: string;
  /** Status as the project reports it for itself. */
  status?: string;
  /** Flag emoji where the upstream list marks the project's language. */
  language?: string;
  verification?: VerificationCheck;
  /** GitHub repo creation date, where the upstream list records one. */
  created?: string;
  tags: string[];
};

export type ResourceLink = {
  title: string;
  url: string;
  description?: string;
  /** Flag emoji where the upstream list marks a resource's language. */
  language?: string;
};

export type ResourceSection = {
  slug: string;
  title: string;
  intro?: string;
  links: ResourceLink[];
};

/** A third-party controlled test of whether REA actually helps. */
export type Study = {
  name: string;
  url: string;
  scale: string;
  finding: string;
  caveats: string;
};

export type MostSharedCase = {
  title: string;
  url: string;
  author: string;
  what: string;
  reach: string;
  tag: string;
};
