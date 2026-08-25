import Link from "next/link";
import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className} fill="none">
      <defs>
        <linearGradient id="mm-mark-grad" x1="2" y1="2" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-violet-500)" />
          <stop offset="55%" stopColor="var(--color-pink-500)" />
          <stop offset="100%" stopColor="var(--color-saffron-500)" />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="44" height="34" rx="13" fill="url(#mm-mark-grad)" />
      <path d="M14 38 L10 46 L22 38 Z" fill="url(#mm-mark-grad)" />
      <circle cx="17" cy="20" r="3.4" fill="var(--color-navy-950)" />
      <circle cx="31" cy="20" r="3.4" fill="var(--color-navy-950)" />
      <path
        d="M15 27c3 3.5 15 3.5 18 0"
        stroke="var(--color-navy-950)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="38.5" cy="8.5" r="5.5" fill="var(--color-lime-400)" />
    </svg>
  );
}

export default function Logo({
  className,
  withTagline = false,
  variant = "light",
}: {
  className?: string;
  withTagline?: boolean;
  variant?: "light" | "dark";
}) {
  return (
    <Link
      href="/"
      className={cn("group flex shrink-0 items-center gap-2.5", className)}
      aria-label="Meme Maloom home"
    >
      <LogoMark className="h-9 w-9 shrink-0 transition duration-300 group-hover:rotate-6 sm:h-10 sm:w-10" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          <span className={variant === "dark" ? "text-white" : "text-navy-900"}>Meme</span>{" "}
          <span className="text-gradient">Maloom</span>
        </span>
        {withTagline ? (
          <span
            className={cn(
              "mt-0.5 text-xs font-semibold",
              variant === "dark" ? "text-navy-300" : "text-navy-500"
            )}
          >
            Indian memes, explained.
          </span>
        ) : null}
      </span>
    </Link>
  );
}
