import { Opportunity } from "@/lib/types";

export default function EligibilityBadges({ opportunity }: { opportunity: Opportunity }) {
  const badges: { label: string; className: string }[] = [];

  if (opportunity.muslim_eligibility.flag === "explicitly_eligible") {
    badges.push({
      label: "Officially mentions Muslim eligibility",
      className: "bg-teal-50 text-teal-800 border-teal-300",
    });
  } else if (opportunity.minority_eligibility.flag === "explicitly_eligible") {
    badges.push({
      label: "Minority welfare scheme",
      className: "bg-teal-50 text-teal-800 border-teal-300",
    });
  } else {
    badges.push({
      label: "Open to all eligible applicants",
      className: "bg-slate-100 text-slate-700 border-slate-300",
    });
  }

  if (opportunity.other_category_eligibility.length > 0) {
    badges.push({
      label: "Reservation/category benefit stated in notification",
      className: "bg-blue-50 text-blue-800 border-blue-300",
    });
  }

  if (opportunity.gender_eligibility === "women_only") {
    badges.push({ label: "Women-specific", className: "bg-pink-50 text-pink-800 border-pink-300" });
  }
  if (opportunity.disability_eligible) {
    badges.push({ label: "Open to persons with disabilities", className: "bg-indigo-50 text-indigo-800 border-indigo-300" });
  }
  if (opportunity.no_application_fee) {
    badges.push({ label: "No application fee", className: "bg-emerald-50 text-emerald-800 border-emerald-300" });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span key={b.label} className={`rounded border px-2 py-0.5 text-[11px] font-medium ${b.className}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}
