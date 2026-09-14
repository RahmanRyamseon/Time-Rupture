import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  title: "PF Wiki — Every Provident Fund Problem & How People Fixed It",
  description:
    "An unofficial, sourced reference for EPF/PF problems: UAN activation, claim rejections, transfers, KYC mismatches, TDS, pensions, and how people actually solved them.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NavBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-foreground/50">
          PF Wiki — an unofficial, community-sourced gateway to Provident Fund problems. Not affiliated
          with EPFO or the Government of India.
        </footer>
      </body>
    </html>
  );
}
