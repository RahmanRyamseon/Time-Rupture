import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rateLimit";

// ANTHROPIC_API_KEY is read here, server-side only, and never referenced
// with a NEXT_PUBLIC_ prefix or imported into a Client Component — it never
// reaches the browser bundle.
const anthropic = new Anthropic();

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

const NATURE_VALUES = [
  "Standard-rated",
  "Zero-rated",
  "Exempt",
  "Blocked input",
  "Import (reverse charge)",
  "Export (zero-rated)",
  "Out of scope",
] as const;

const ClassificationSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      classifiedNature: z.enum(NATURE_VALUES),
      confidence: z.number().min(0).max(1),
      reasoning: z.string().max(280),
    })
  ),
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
    const response = await anthropic.messages.parse({
      model: "claude-opus-5",
      max_tokens: 8000,
      system:
        "You are a Bahrain VAT compliance classifier. For each transaction line, classify its likely VAT nature " +
        "under VAT Decree-Law 48/2018 and its Executive Regulations, based only on its description text: " +
        "Standard-rated, Zero-rated (e.g. basic food items on the NBR list, exports), Exempt (e.g. residential rent, " +
        "local passenger transport, certain financial services), Blocked input (Art. 42(C) — entertainment, " +
        "personal-use motor vehicles, non-business hospitality), Import (reverse charge), Export (zero-rated), or " +
        "Out of scope if the description gives no basis for classification. Give a confidence 0–1 and a short reason.",
      messages: [
        {
          role: "user",
          content: JSON.stringify(parsed.data.lines),
        },
      ],
      output_config: { format: zodOutputFormat(ClassificationSchema) },
    });

    if (!response.parsed_output) {
      throw new Error("Model did not return parseable output.");
    }

    return NextResponse.json({ results: response.parsed_output.results });
  } catch (err) {
    // Log the real error server-side only — never leak provider/internal
    // details (status codes, response bodies) to the client.
    console.error("AI classification failed:", err);
    return NextResponse.json({ error: "Classification failed. Try again." }, { status: 502 });
  }
}
