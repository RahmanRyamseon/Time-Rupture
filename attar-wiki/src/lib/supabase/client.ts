"use client";
import type { SupabaseClient } from "@supabase/supabase-js";

let promise: Promise<SupabaseClient | null> | null = null;

export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Lazily loads the Supabase browser client so it is not part of the first-load
 * JavaScript of every wiki page (reading pages never need it).
 */
export function getBrowserClient(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured()) return Promise.resolve(null);
  promise ??= import("@supabase/ssr").then(({ createBrowserClient }) =>
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
  );
  return promise;
}
