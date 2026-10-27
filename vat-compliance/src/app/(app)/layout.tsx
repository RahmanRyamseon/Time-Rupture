import { WorkpaperProvider } from "@/lib/workpaper/context";
import Shell from "./Shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkpaperProvider>
      <Shell>{children}</Shell>
    </WorkpaperProvider>
  );
}
