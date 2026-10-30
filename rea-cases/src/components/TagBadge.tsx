import Link from "next/link";
import type { EvidenceTag } from "@/lib/types";
import { TAG_INFO, tagSlug } from "@/lib/tags";

/**
 * The evidence tag, rendered as a link to every other case with the same
 * tag. `title` carries the tag's meaning so a reader who doesn't know the
 * vocabulary isn't left guessing.
 */
export function TagBadge({
  tag,
  source,
  linked = true,
}: {
  tag: EvidenceTag;
  source?: string;
  linked?: boolean;
}) {
  const info = TAG_INFO[tag];
  const label = source ? `${info.label} (${source})` : info.label;
  const className = `inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${info.className}`;

  if (!linked) {
    return (
      <span className={className} title={info.meaning}>
        {label}
      </span>
    );
  }

  return (
    <Link href={`/tag/${tagSlug(tag)}`} className={`${className} hover:opacity-80`} title={info.meaning}>
      {label}
    </Link>
  );
}
