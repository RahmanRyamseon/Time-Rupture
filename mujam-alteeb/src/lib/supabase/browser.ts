"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from "./config";

/** True when community features (accounts, votes, edits…) are configured for this deployment. */
export const communityEnabled = supabaseConfigured;

let pending: Promise<SupabaseClient | null> | null = null;

/**
 * Lazily loads the Supabase client. The library is only downloaded when Supabase is configured
 * and a component actually needs it, so read-only visitors never pay for it.
 */
export function loadSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  pending ??= import("@supabase/ssr").then((m) => m.createBrowserClient(supabaseUrl, supabaseAnonKey));
  return pending;
}

/** React hook: null until the client is loaded (or forever when community features are off). */
export function useSupabase(): SupabaseClient | null {
  const [sb, setSb] = useState<SupabaseClient | null>(null);
  useEffect(() => {
    if (!supabaseConfigured) return;
    let alive = true;
    loadSupabase().then((c) => { if (alive) setSb(c); });
    return () => { alive = false; };
  }, []);
  return sb;
}
