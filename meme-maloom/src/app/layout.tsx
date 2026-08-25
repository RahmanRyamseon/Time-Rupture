import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans, Noto_Sans_Devanagari } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = "https://www.mememaloom.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Meme Maloom — Indian memes, explained.",
    template: "%s | Meme Maloom",
  },
  description:
    "Meme Maloom helps you discover, understand and explore Indian memes across Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi and more — with origin, language and cultural context explained.",
  keywords: [
    "Indian memes",
    "meme explained",
    "Hindi memes",
    "Tamil memes",
    "Telugu memes",
    "regional memes India",
    "meme culture India",
    "meme ka matlab",
  ],
  authors: [{ name: "Meme Maloom" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "Meme Maloom",
    title: "Meme Maloom — Indian memes, explained.",
    description:
      "Discover, understand and explore Indian memes from every region and language. Meme ka matlab, maloom.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meme Maloom — Indian memes, explained.",
    description:
      "Discover, understand and explore Indian memes from every region and language.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jakarta.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream text-navy-900 selection:bg-lime-400 selection:text-navy-950">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:bg-gradient-to-r focus:from-violet-500 focus:to-pink-500 focus:px-4 focus:py-2 focus:font-bold focus:text-white"
        >
          Skip to content
        </a>
        <noscript>
          <style>{".reveal { opacity: 1 !important; }"}</style>
        </noscript>
        <Header />
        <main id="main-content" className="flex flex-1 flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
