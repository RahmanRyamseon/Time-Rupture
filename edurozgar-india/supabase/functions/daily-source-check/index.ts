// Daily source-check job for EduRozgar India.
//
// What this does (and does NOT do):
// - Fetches every watched official URL (source_checks), hashes the response body,
//   and compares it to the hash from the last run.
// - If the content changed, a link broke, or an opportunity's next_verification_date
//   has arrived, it writes a row to review_queue.
// - It NEVER edits `opportunities` directly. A content hash changing tells you a
//   government page is different — it does not tell you which field changed, whether
//   the change is material, or what the new correct value is. That judgment call is
//   exactly the kind of thing this platform's own disclaimers warn against getting
//   wrong, so it stays with a human editor in the admin panel's review queue.
//
// Invoked daily by pg_cron (see supabase/migrations/*_schedule_daily_source_check.sql),
// which calls this function over HTTP with a shared secret read from the
// app_secrets table (id='cron_secret') rather than exposing this endpoint for
// public/anonymous invocation. The secret is compared against app_secrets
// rather than a Deno env var because it's set once via SQL when the table is
// created — see that migration for how to rotate it.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FETCH_TIMEOUT_MS = 20_000;
// A plain "EduRozgarIndiaSourceMonitor/1.0" UA gets 403'd by several .gov.in sites'
// bot protection (confirmed empirically — see README's "Keeping this current" section).
// A realistic browser UA gets past naive bot filters without pretending to be a real
// browser in any way that matters for a same-origin GET request like this one.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

interface SourceCheckRow {
  id: string;
  opportunity_id: string;
  url_type: string;
  url: string;
  content_hash: string | null;
}

async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const provided = req.headers.get("x-cron-secret");
  const { data: secretRow } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("id", "cron_secret")
    .maybeSingle();

  if (!secretRow || provided !== secretRow.value) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const { data: sourceChecks, error: sourceErr } = await supabase
    .from("source_checks")
    .select("id, opportunity_id, url_type, url, content_hash")
    .eq("enabled", true);

  if (sourceErr) {
    return new Response(JSON.stringify({ error: sourceErr.message }), { status: 500 });
  }

  let checked = 0;
  let changed = 0;
  let broken = 0;
  let errored = 0;

  for (const row of (sourceChecks ?? []) as SourceCheckRow[]) {
    checked++;
    const now = new Date().toISOString();

    try {
      const res = await fetchWithTimeout(row.url);
      const bytes = await res.arrayBuffer();
      const hash = await hashBytes(bytes);
      const isBroken = res.status >= 400;

      const previousHash = row.content_hash;
      const contentChanged = previousHash !== null && previousHash !== hash;

      await supabase
        .from("source_checks")
        .update({
          last_checked_at: now,
          last_status_code: res.status,
          content_hash: hash,
          last_changed_at: contentChanged ? now : undefined,
          last_error: null,
        })
        .eq("id", row.id);

      if (isBroken) {
        broken++;
        await upsertPendingReview(supabase, {
          opportunity_id: row.opportunity_id,
          source_check_id: row.id,
          reason: "link_broken",
          detail: { url: row.url, status: res.status },
        });
      } else if (contentChanged) {
        changed++;
        await upsertPendingReview(supabase, {
          opportunity_id: row.opportunity_id,
          source_check_id: row.id,
          reason: "content_changed",
          detail: { url: row.url, previous_hash: previousHash, new_hash: hash },
        });
      }
    } catch (err) {
      errored++;
      await supabase
        .from("source_checks")
        .update({
          last_checked_at: now,
          last_status_code: null,
          last_error: String(err instanceof Error ? err.message : err),
        })
        .eq("id", row.id);

      await upsertPendingReview(supabase, {
        opportunity_id: row.opportunity_id,
        source_check_id: row.id,
        reason: "link_broken",
        detail: { url: row.url, error: String(err instanceof Error ? err.message : err) },
      });
    }
  }

  // Anything whose scheduled re-verification date has arrived, regardless of whether
  // its watched pages changed — a scheme's real-world status can move (applications
  // closing, results out) without a single byte of the linked PDF changing.
  const today = new Date().toISOString().slice(0, 10);
  const { data: dueOpportunities } = await supabase
    .from("opportunities")
    .select("id")
    .lte("next_verification_date", today);

  let due = 0;
  for (const o of dueOpportunities ?? []) {
    due++;
    await upsertPendingReview(supabase, {
      opportunity_id: o.id,
      source_check_id: null,
      reason: "verification_due",
      detail: { next_verification_date: today },
    });
  }

  await supabase.from("audit_log").insert({
    action: "daily_source_check_run",
    actor: "edge-function:daily-source-check",
    detail: { checked, changed, broken, errored, due },
  });

  return new Response(JSON.stringify({ checked, changed, broken, errored, due }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function upsertPendingReview(
  supabase: ReturnType<typeof createClient>,
  entry: {
    opportunity_id: string;
    source_check_id: string | null;
    reason: "content_changed" | "link_broken" | "verification_due";
    detail: Record<string, unknown>;
  }
) {
  // Don't pile up duplicate pending entries for the same opportunity+reason across runs.
  const { data: existing } = await supabase
    .from("review_queue")
    .select("id")
    .eq("opportunity_id", entry.opportunity_id)
    .eq("reason", entry.reason)
    .eq("status", "pending")
    .limit(1);

  if (existing && existing.length > 0) return;

  await supabase.from("review_queue").insert({
    opportunity_id: entry.opportunity_id,
    source_check_id: entry.source_check_id,
    reason: entry.reason,
    detail: entry.detail,
  });
}
