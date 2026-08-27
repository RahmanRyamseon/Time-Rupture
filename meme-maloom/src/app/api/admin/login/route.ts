import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createSessionToken, passwordMatches } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!passwordMatches(password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

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
