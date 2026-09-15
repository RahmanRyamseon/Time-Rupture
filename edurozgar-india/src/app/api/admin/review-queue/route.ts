import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/adminClient";

// Demo-grade authorization only: a shared token header, not real auth (no
// roles, no session, no audit of who is calling). See README — a production
// deployment needs real authentication in front of every /api/admin/* route.
function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return false; // fail closed if not configured
  return req.headers.get("x-admin-token") === expected;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("review_queue")
    .select("id, opportunity_id, source_check_id, reason, detail, status, created_at, resolved_at, resolved_by")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const action = body?.action as "applied" | "dismissed" | undefined;
  if (!id || (action !== "applied" && action !== "dismissed")) {
    return NextResponse.json({ error: "expected { id, action: 'applied' | 'dismissed' }" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("review_queue")
    .update({ status: action, resolved_at: new Date().toISOString(), resolved_by: "admin-panel" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("audit_log").insert({
    action: `review_queue_${action}`,
    actor: "admin-panel",
    detail: { review_queue_id: id },
  });

  return NextResponse.json({ ok: true });
}
