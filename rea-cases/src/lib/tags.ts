import type { EvidenceTag } from "@/lib/types";

/**
 * What each evidence tag means, in the upstream list's own terms, plus the
 * colour tokens the badge uses. The tag is the whole point of the index: it
 * separates "the author says REA was used" from "nobody has checked".
 */
export const TAG_INFO: Record<
  EvidenceTag,
  { label: string; meaning: string; className: string }
> = {
  REA: {
    label: "REA",
    meaning:
      "The project README, the author's post or the official showcase says morluto/rea was used.",
    className: "bg-brand-soft text-brand-strong border-brand/30",
  },
  "REA (partial)": {
    label: "REA (partial)",
    meaning:
      "REA did part of the work — an inventory, a probe, some vendor findings — while the rest used other tools.",
    className: "bg-brand-soft/60 text-brand-strong border-brand/20",
  },
  "AI-RE": {
    label: "AI-RE",
    meaning: "AI reverse engineering with other tools, or with no tool named.",
    className: "bg-accent-soft text-accent border-accent/30",
  },
  Rebuild: {
    label: "Rebuild",
    meaning: "Clean-room rewrite with no reverse-engineering evidence.",
    className: "bg-surface-muted text-foreground/70 border-border",
  },
  "Claim?": {
    label: "Claim?",
    meaning: "Not yet verified.",
    className: "bg-danger-soft text-danger border-danger/30",
  },
  "Manual RE": {
    label: "Manual RE",
    meaning: "Reverse-engineered by hand, with no AI stated.",
    className: "bg-surface-muted text-foreground/70 border-border",
  },
};

export const TAG_ORDER: EvidenceTag[] = [
  "REA",
  "REA (partial)",
  "AI-RE",
  "Rebuild",
  "Manual RE",
  "Claim?",
];

/** URL-safe slug for a tag, used by /tag/[slug]. */
export function tagSlug(tag: EvidenceTag): string {
  return tag
    .toLowerCase()
    .replace(/[()?]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function tagFromSlug(slug: string): EvidenceTag | undefined {
  return TAG_ORDER.find((t) => tagSlug(t) === slug);
}
