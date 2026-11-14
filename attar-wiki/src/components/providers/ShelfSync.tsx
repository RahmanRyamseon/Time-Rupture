"use client";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { syncShelf } from "@/lib/client/shelf";

/** Syncs the offline shelf queue when the user signs in or comes back online. */
export function ShelfSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    void syncShelf();
    const onOnline = () => void syncShelf();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [user]);
  return null;
}
