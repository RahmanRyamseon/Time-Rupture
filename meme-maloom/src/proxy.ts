import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";

// Gate every /admin page and /api/admin endpoint behind the signed session
// cookie, except the login page/endpoint themselves. This is the actual
// access control — the pages aren't linked from public nav, but that's just
// obscurity, not security, so it's not relied on alone.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginRoute = pathname === "/admin/login" || pathname === "/api/admin/login";
  if (isLoginRoute) return NextResponse.next();

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  if (!authed) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
