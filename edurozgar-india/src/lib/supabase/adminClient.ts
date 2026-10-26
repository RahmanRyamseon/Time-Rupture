import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Service-role client. Bypasses RLS — only import this from server-only code
 * (Route Handlers under src/app/api/admin/*), never from a "use client" file
 * or anything that ships to the browser. Null until SUPABASE_SERVICE_ROLE_KEY
 * is set (see .env.example) — admin routes should treat that as "not configured"
 * rather than crash.
 */
export const supabaseAdmin = url && serviceRoleKey ? createClient(url, serviceRoleKey) : null;
