import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** One compact line listing what is not documented yet, instead of many empty boxes. */
export async function HelpComplete({ fields, editHref }: { fields: string[]; editHref: string }) {
  if (fields.length === 0) return null;
  const t = await getTranslations();
  const labels = fields.map((f) => (t.has(`field.${f}`) ? t(`field.${f}`) : t.has(`attar.${f}`) ? t(`attar.${f}`) : f));
  return (
    <aside className="reading mt-2 mb-10 rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted">
      {t("wiki.helpComplete", { fields: labels.join(", ") })}{" "}
      <Link href={editHref} className="font-semibold">
        {t("wiki.helpCompleteLink")}
      </Link>
    </aside>
  );
}
