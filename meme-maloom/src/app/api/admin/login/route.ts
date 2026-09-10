import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  isLoginRateLimited,
  passwordMatches,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/admin-auth";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const key = clientKey(request);
  if (isLoginRateLimited(key)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!(await passwordMatches(password))) {
    recordLoginFailure(key);
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  recordLoginSuccess(key);

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours, matches the token's own expiry
  });
  return response;
}
