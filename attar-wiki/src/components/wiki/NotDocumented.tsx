import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function NotDocumented({ editHref, inline = false }: { editHref?: string; inline?: boolean }) {
  const t = await getTranslations("wiki");
  const Tag = inline ? "span" : "p";
  return (
    <Tag className={`${inline ? "" : "rounded-lg border border-dashed border-line bg-sand/50 px-4 py-3"} text-sm italic text-muted`}>
      {editHref ? (
        <Link href={editHref} className="text-muted underline decoration-dotted hover:text-amber">
          {t("notDocumented")}
        </Link>
      ) : (
        t("notDocumented")
      )}
    </Tag>
  );
}
