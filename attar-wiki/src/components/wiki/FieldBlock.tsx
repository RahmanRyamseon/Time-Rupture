import type { Footnotes } from "@/lib/citations";
import { Cite } from "./Cite";
import { Markdown } from "./Markdown";
import { NotDocumented } from "./NotDocumented";

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
  if (!value || !value.trim()) return <NotDocumented editHref={editHref} />;
  return (
    <>
      <Markdown>{value}</Markdown>
      <Cite field={field} footnotes={footnotes} missing={missing} />
    </>
  );
}
