import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Public, RLS-scoped client — safe to use in both server and client components.
 * Only reaches tables/rows the "opportunities are publicly readable" policy
 * (and similar) allow for the anon/publishable key. Null when the project
 * isn't configured, so callers can fall back to bundled sample data.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
