import Link from "next/link";
import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <rect x="2" y="4" width="44" height="34" rx="12" fill="var(--color-saffron-500)" />
      <path d="M14 38 L10 46 L22 38 Z" fill="var(--color-saffron-500)" />
      <circle cx="17" cy="20" r="3.4" fill="var(--color-navy-900)" />
      <circle cx="31" cy="20" r="3.4" fill="var(--color-navy-900)" />
      <path
        d="M15 27c3 3.5 15 3.5 18 0"
        stroke="var(--color-navy-900)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="38" cy="9" r="5" fill="var(--color-mint-500)" />
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
      className={cn("flex items-center gap-2.5 shrink-0", className)}
      aria-label="Meme Maloom home"
    >
      <LogoMark className="h-9 w-9 sm:h-10 sm:w-10" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-xl font-extrabold tracking-tight sm:text-2xl",
            variant === "dark" ? "text-white" : "text-navy-900"
          )}
        >
          Meme <span className="text-saffron-500">Maloom</span>
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
