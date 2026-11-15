import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AttarNoteRef, NotePosition } from "@/lib/types";

export async function NotesPyramid({ notes }: { notes: AttarNoteRef[] }) {
  const t = await getTranslations("position");
  const ta = await getTranslations("attar");
  const onlyListed = notes.length > 0 && notes.every((n) => n.position === "listed");
  const locale = await getLocale();
  const tiers: NotePosition[] = ["top", "heart", "base", "listed"];
  return (
    <div className="space-y-4">
      {tiers.map((tier, i) => {
        const items = notes.filter((n) => n.position === tier);
        if (!items.length) return null;
        return (
          <div key={tier} className="flex flex-col gap-2 sm:flex-row sm:items-baseline">
            <h3 className="w-28 shrink-0 font-sans text-sm font-semibold uppercase tracking-wider text-muted">{t(tier)}</h3>
            <ul className="flex flex-wrap gap-2" style={{ paddingLeft: tier === "listed" ? 0 : `${i * 0.5}rem` }}>
              {items.map((n) => (
                <li key={n.note.id}>
                  <Link href={`/notes/${n.note.slug}`} className="chip">
                    {locale === "hi" && n.note.name_hi ? n.note.name_hi : n.note.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {onlyListed ? <p className="text-xs text-muted">{ta("listedNotesHelp")}</p> : null}
    </div>
  );
}
