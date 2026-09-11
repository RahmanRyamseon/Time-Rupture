import { Opportunity } from "@/lib/types";
import { STATUS_CLASSES, STATUS_LABEL, liveStatus } from "@/lib/helpers";

export default function StatusBadge({ opportunity }: { opportunity: Opportunity }) {
  const status = liveStatus(opportunity);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
