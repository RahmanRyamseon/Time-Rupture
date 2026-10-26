import { createClient } from "@/lib/supabase/server";
import { WorkpaperProvider } from "@/lib/workpaper/context";
import Shell from "./Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth is optional for now — the app is directly accessible without
  // signing in. When a session does exist (someone used /login), we still
  // look up their role so the admin nav item/page show up correctly.
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <WorkpaperProvider>
      <Shell email={user?.email ?? null} isAdmin={isAdmin}>
        {children}
      </Shell>
    </WorkpaperProvider>
  );
}
