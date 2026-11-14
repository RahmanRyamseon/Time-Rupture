import "server-only";
import type { AuthContext } from "./http";

export async function loadShelf(ctx: AuthContext) {
  const { data } = await ctx.supabase
    .from("shelf_items")
    .select("attar_id, status, personal_note, updated_at, attar:attars(slug, name)")
    .eq("user_id", ctx.user.id)
    .order("updated_at", { ascending: false });
  return ((data ?? []) as unknown as { attar_id: string; status: string; updated_at: string; attar: { slug: string; name: string } | null }[])
    .filter((r) => r.attar)
    .map((r) => ({ attarId: r.attar_id, slug: r.attar!.slug, name: r.attar!.name, status: r.status, updatedAt: r.updated_at }));
}
