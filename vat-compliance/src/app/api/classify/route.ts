import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";
import { classifyLines } from "@/lib/ai/classify";

const MAX_LINES_PER_REQUEST = 300;
const MAX_DESC_LENGTH = 400;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const RequestSchema = z.object({
  lines: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        desc: z.string().max(MAX_DESC_LENGTH),
      })
    )
    .min(1)
    .max(MAX_LINES_PER_REQUEST),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRateLimited(user.id, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many classification requests. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const { provider, results } = await classifyLines(parsed.data.lines);
    return NextResponse.json({ provider, results });
  } catch (err) {
    // Log the real error server-side only — never leak provider/internal
    // details (status codes, response bodies) to the client.
    console.error("AI classification failed:", err);
    const message = err instanceof Error && err.message.startsWith("No AI provider configured") ? err.message : "Classification failed. Try again.";
    const status = err instanceof Error && err.message.startsWith("No AI provider configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
