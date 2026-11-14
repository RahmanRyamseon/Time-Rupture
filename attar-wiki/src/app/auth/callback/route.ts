import { NextResponse, type NextRequest } from "next/server";
import { createRequestClient } from "@/lib/supabase/server";

/** Exchanges the Supabase auth code (magic link / OAuth) for a session cookie. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/";
  // Only allow same-site relative redirects.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  if (code) {
    const supabase = await createRequestClient();
    const { error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? { error: new Error("not configured") };
    if (!error) return NextResponse.redirect(new URL(next, req.nextUrl.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=1", req.nextUrl.origin));
}
