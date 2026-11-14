import "server-only";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import { createRequestClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import type { UserRole } from "@/lib/types";

export function json<T>(data: T, init: ResponseInit & { cache?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.cache) headers.set("Cache-Control", init.cache);
  return NextResponse.json(data, { ...init, headers });
}

export function apiError(status: number, error: string, details?: unknown) {
  return NextResponse.json({ error, details }, { status, headers: { "Cache-Control": "no-store" } });
}

export const PUBLIC_CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
  role: UserRole;
}

/** Resolves the caller (cookie or bearer token). Returns a Response on failure. */
export async function requireUser(minRole: UserRole = "contributor"): Promise<AuthContext | Response> {
  const supabase = await createRequestClient();
  if (!supabase) return apiError(503, "Supabase is not configured");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError(401, "Sign in required");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = ((profile?.role as UserRole) ?? "contributor") satisfies UserRole;
  const rank: Record<UserRole, number> = { reader: 0, contributor: 1, editor: 2, admin: 3 };
  if (rank[role] < rank[minRole]) return apiError(403, "Insufficient role");
  return { supabase, user, role };
}

export async function publicClient() {
  const supabase = await createRequestClient();
  if (!supabase) return null;
  return supabase;
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiError(400, "Invalid JSON body");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return apiError(422, "Validation failed", z.flattenError(parsed.error));
  return parsed.data;
}

/** Revalidate a wiki path in every locale (paths are the internal /[locale]/... routes). */
export function revalidateWiki(...paths: string[]) {
  for (const p of paths) {
    for (const locale of routing.locales) {
      revalidatePath(`/${locale}${p === "/" ? "" : p}`);
    }
  }
}

export const uuid = z.uuid();
