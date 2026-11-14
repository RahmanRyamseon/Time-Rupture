import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createPublicClient } from "@/lib/supabase/server";
import { getEntityRow } from "@/lib/data/wiki";
import { SECTION_DEFS, type Section } from "@/lib/sections";
import { EditForm, type EditOptions } from "./EditForm";

export async function EditPage({ section, slug }: { section: Section; slug?: string }) {
  const t = await getTranslations();
  const def = SECTION_DEFS[section];
  const row = slug ? await getEntityRow(section, slug) : null;
  if (slug && !row) notFound();
  const supabase = createPublicClient();

  const options: EditOptions = { houses: [], regions: [], notes: [], attars: [], currentNotes: [], currentRelations: [], baseRevisionId: null };
  if (supabase) {
    const needsHouses = def.fields.some((f) => f.kind === "house_ref");
    const needsRegions = def.fields.some((f) => f.kind === "region_ref");
    const [houses, regions, notes, attars, curNotes, curRel, rev] = await Promise.all([
      needsHouses ? supabase.from("houses").select("id, name").order("name").limit(2000) : null,
      needsRegions ? supabase.from("regions").select("id, name").order("name").limit(500) : null,
      section === "attars" ? supabase.from("notes").select("id, name").order("name").limit(3000) : null,
      section === "attars" ? supabase.from("attars").select("id, name").order("name").limit(5000) : null,
      section === "attars" && row ? supabase.from("attar_notes").select("note_id, position").eq("attar_id", row.id).order("sort_order") : null,
      section === "attars" && row
        ? supabase.from("attar_relations").select("related_attar_id, external_name, relation, note").eq("attar_id", row.id)
        : null,
      row
        ? supabase.from("revisions").select("id").eq("entity_type", def.type).eq("entity_id", row.id).order("id", { ascending: false }).limit(1).maybeSingle()
        : null,
    ]);
    options.houses = (houses?.data as EditOptions["houses"]) ?? [];
    options.regions = (regions?.data as EditOptions["regions"]) ?? [];
    options.notes = (notes?.data as EditOptions["notes"]) ?? [];
    options.attars = ((attars?.data as EditOptions["attars"]) ?? []).filter((a) => a.id !== row?.id);
    options.currentNotes = (curNotes?.data as EditOptions["currentNotes"]) ?? [];
    options.currentRelations = (curRel?.data as EditOptions["currentRelations"]) ?? [];
    options.baseRevisionId = (rev?.data?.id as number) ?? null;
  }

  const title = row ? (row[def.titleField] as string) : null;
  return (
    <div className="container-wiki py-10">
      {row ? (
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link href={`/${section}/${slug}`}>← {title}</Link>
        </nav>
      ) : null}
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
        {row ? t("edit.title", { name: title! }) : t("edit.newTitle", { type: t(`types.${def.type}`).toLowerCase() })}
      </h1>
      <p className="reading mt-3 rounded-lg border-l-4 border-gold bg-sand/60 px-4 py-3 text-sm">{t("edit.intro")}</p>
      <EditForm section={section} row={row} options={options} />
    </div>
  );
}
