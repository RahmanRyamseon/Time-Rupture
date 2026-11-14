import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { hasSupabase } from "@/lib/site";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Anonymous, cookie-free client for public wiki reads. Safe inside ISR pages
 * because it never touches request-specific data.
 */
export function createPublicClient(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  return createJsClient(url(), anonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Request-scoped client. Uses the Supabase auth cookie set by the website or,
 * for native apps, an `Authorization: Bearer <access token>` header.
 */
export async function createRequestClient(): Promise<SupabaseClient | null> {
  if (!hasSupabase()) return null;
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return createJsClient(url(), anonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: auth } },
    });
  }
  const cookieStore = await cookies();
  return createServerClient(url(), anonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}
