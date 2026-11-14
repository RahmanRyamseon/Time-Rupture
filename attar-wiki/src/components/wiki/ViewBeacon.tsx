"use client";
import { useEffect } from "react";
import type { EntityType } from "@/lib/types";

/** Anonymous page-view counter (no cookies, no user id). Powers "most-viewed pages lacking data". */
export function ViewBeacon({ type, id }: { type: EntityType; id: string }) {
  useEffect(() => {
    const key = `viewed:${type}:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const body = JSON.stringify({ type, id });
    if (!navigator.sendBeacon?.("/api/v1/views", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/v1/views", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  }, [type, id]);
  return null;
}
