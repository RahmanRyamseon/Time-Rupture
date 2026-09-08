import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkpaperProvider } from "@/lib/workpaper/context";
import Shell from "./Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth: proxy.ts already redirects unauthenticated requests
  // before they reach here, but a Server Component never trusts that alone.
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  return (
    <WorkpaperProvider>
      <Shell email={user.email ?? ""} isAdmin={isAdmin}>
        {children}
      </Shell>
    </WorkpaperProvider>
  );
}
