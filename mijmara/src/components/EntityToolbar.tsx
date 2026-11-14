import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { EntityType, Locale } from "@/lib/types";
import { Icon } from "./Icon";
import { FlagButton } from "./client/FlagButton";

export async function EntityToolbar({ locale, editHref, historyHref, entityType, entityId, fields, children }: {
  locale: Locale; editHref: string; historyHref: string; entityType: EntityType; entityId: string; fields: string[]; children?: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "common" });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <Link prefetch={false} href={editHref} className="btn btn-ghost text-sm"><Icon name="pen" className="h-4 w-4" />{t("edit")}</Link>
      <Link prefetch={false} href={historyHref} className="btn btn-ghost text-sm"><Icon name="clock" className="h-4 w-4" />{t("history")}</Link>
      <FlagButton entityType={entityType} entityId={entityId} fields={fields} />
    </div>
  );
}
