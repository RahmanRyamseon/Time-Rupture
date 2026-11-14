import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = intl(request);

  // Refresh the Supabase session cookie (keeps SSR auth in sync).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }
  return response ?? NextResponse.next();
}

export const config = {
  // Skip API, auth callback, Next internals, the service worker and static files.
  matcher: ["/((?!api|auth|_next|_vercel|serwist|.*\\..*).*)"],
};
