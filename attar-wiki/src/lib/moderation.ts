import "server-only";
import { createRequestClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function getModerator(min: "editor" | "admin" = "editor") {
  const supabase = await createRequestClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (data?.role as UserRole) ?? "contributor";
  const ok = min === "admin" ? role === "admin" : role === "editor" || role === "admin";
  return ok ? { supabase, user, role } : null;
}
