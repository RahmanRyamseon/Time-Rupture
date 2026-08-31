import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/lib/store";
import { NavBar } from "@/components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nuqati (نقاطي) — GCC Credit Card Points Optimizer",
  description:
    "Which card should you swipe? What are your points really worth? Nuqati helps Bahrain cardholders optimize rewards across every card in their wallet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppStateProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
          <footer className="border-t border-border py-6 text-center text-xs text-foreground/50">
            Nuqati — a Bahrain-first GCC credit card rewards optimizer. No bank login required.
          </footer>
        </AppStateProvider>
      </body>
    </html>
  );
}
