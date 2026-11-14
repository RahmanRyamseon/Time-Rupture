"use client";
import { useEffect } from "react";
import { compareStore, type CompareItem } from "@/lib/client/store";

/** Keeps the floating compare tray in step with the URL being viewed. */
export function CompareSync({ items }: { items: CompareItem[] }) {
  const key = items.map((i) => i.slug).join(",");
  useEffect(() => {
    compareStore.write(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
