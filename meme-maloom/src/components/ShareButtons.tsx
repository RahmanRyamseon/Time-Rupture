"use client";

import { useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

export default function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  // useSyncExternalStore is the SSR-safe way to read a browser-only value:
  // it renders the server snapshot ("") on first paint, then swaps in the
  // real URL without triggering a hydration mismatch.
  const url = useSyncExternalStore(
    noopSubscribe,
    () => window.location.href,
    () => ""
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const shareText = encodeURIComponent(`${title} — explained on Meme Maloom`);
  const encodedUrl = encodeURIComponent(url);

  const targets = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${shareText}%20${encodedUrl}`,
      color: "bg-mint-500 hover:bg-mint-600",
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`,
      color: "bg-navy-900 hover:bg-navy-800",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "bg-navy-600 hover:bg-navy-700",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {targets.map((t) => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-full px-4 py-2 text-sm font-bold text-white transition ${t.color}`}
        >
          Share on {t.label}
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full border-2 border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-800 transition hover:bg-navy-900/5"
      >
        {copied ? "Link copied!" : "Copy link"}
      </button>
    </div>
  );
}
