import { z } from "zod";
import { apiError, json, parseBody, requireUser } from "@/lib/api/http";

const Body = z.object({ role: z.enum(["contributor", "editor", "admin"]) });

export async function POST(req: Request, ctx: RouteContext<"/api/v1/moderation/users/[id]">) {
  const auth = await requireUser("admin");
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError(400, "Bad id");
  if (id === auth.user.id) return apiError(422, "You cannot change your own role");
  const body = await parseBody(req, Body);
  if (body instanceof Response) return body;
  const { error } = await auth.supabase.from("profiles").update({ role: body.role }).eq("id", id);
  if (error) return apiError(400, error.message);
  return json({ ok: true });
}
