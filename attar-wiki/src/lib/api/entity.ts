import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateWiki } from "./http";

/** Revalidate an attar page after community data changes. */
export async function revalidateAttarById(supabase: SupabaseClient, attarId: string) {
  const { data } = await supabase.from("attars").select("slug").eq("id", attarId).maybeSingle();
  if (data?.slug) revalidateWiki(`/attars/${data.slug}`);
}
