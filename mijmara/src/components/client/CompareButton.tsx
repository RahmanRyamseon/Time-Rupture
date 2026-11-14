"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { COMPARE_KEY, onStoreChange, readJSON, writeJSON } from "@/lib/local-store";
import { Icon } from "../Icon";

export function CompareButton({ id, compareHref }: { id: string; compareHref: string }) {
  const t = useTranslations("common");
  const [ids, setIds] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  useEffect(() => { const load = () => setIds(readJSON<string[]>(COMPARE_KEY, [])); load(); return onStoreChange(load); }, []);
  const on = ids.includes(id);
  function toggle() {
    const cur = readJSON<string[]>(COMPARE_KEY, []);
    if (on) return writeJSON(COMPARE_KEY, cur.filter((x) => x !== id));
    if (cur.length >= 4) return setMsg(t("compareFull"));
    writeJSON(COMPARE_KEY, [...cur, id]);
  }
  return (
    <>
      <button type="button" onClick={toggle} aria-pressed={on} className={`btn text-sm ${on ? "btn-gold" : "btn-ghost"}`}>
        <Icon name="scale" className="h-4 w-4" />{on ? t("removeFromCompare") : t("addToCompare")}
      </button>
      {ids.length > 0 && <Link prefetch={false} className="btn btn-ghost text-sm" href={`${compareHref}?p=${ids.join(",")}`}>{t("compareCount", { count: ids.length })}</Link>}
      {msg && <span role="status" className="text-sm text-gold-300">{msg}</span>}
    </>
  );
}
