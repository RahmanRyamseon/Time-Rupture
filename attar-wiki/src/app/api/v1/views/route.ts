import { z } from "zod";
import { apiError, parseBody, publicClient } from "@/lib/api/http";

const Body = z.object({
  type: z.enum(["attar", "house", "note", "region", "glossary", "guide"]),
  id: z.uuid(),
});

/** Anonymous page-view beacon. Stores only a daily counter per page. */
export async function POST(req: Request) {
  const body = await parseBody(req, Body);
  if (body instanceof Response) return body;
  const supabase = await publicClient();
  if (!supabase) return new Response(null, { status: 204 });
  const { error } = await supabase.rpc("record_view", { p_type: body.type, p_id: body.id });
  if (error) return apiError(500, "Could not record view");
  return new Response(null, { status: 204 });
}
