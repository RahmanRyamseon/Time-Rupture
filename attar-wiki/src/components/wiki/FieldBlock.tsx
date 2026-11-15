import type { Footnotes } from "@/lib/citations";
import { Cite } from "./Cite";
import { Markdown } from "./Markdown";

/** A documented markdown field with footnotes, or the "help add it" prompt. */
export function FieldBlock({
  value,
  field,
  footnotes,
  missing,
  editHref,
}: {
  value: string | null | undefined;
  field: string;
  footnotes: Footnotes;
  missing: string[];
  editHref: string;
}) {
  // Empty fields render nothing; pages list gaps once via <HelpComplete>.
  if (!value || !value.trim()) return null;
  void editHref;
  return (
    <>
      <Markdown>{value}</Markdown>
      <Cite field={field} footnotes={footnotes} missing={missing} />
    </>
  );
}
