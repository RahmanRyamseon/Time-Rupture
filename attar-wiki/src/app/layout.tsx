import type { ReactNode } from "react";
import "./globals.css";

// The real <html> lives in app/[locale]/layout.tsx (next-intl pattern).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
