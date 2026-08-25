import { cn } from "@/lib/utils";

/** Decorative gradient wave divider between alternating-tone homepage sections. */
export default function WaveDivider({
  flip = false,
  className,
}: {
  flip?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative h-8 overflow-hidden sm:h-12", className)}
    >
      <svg
        viewBox="0 0 120 16"
        preserveAspectRatio="none"
        className={cn("h-full w-full", flip && "rotate-180")}
      >
        <defs>
          <linearGradient id={`wave-grad-${flip ? "b" : "a"}`} x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--color-violet-400)" stopOpacity="0.12" />
            <stop offset="50%" stopColor="var(--color-pink-400)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-saffron-400)" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path
          d="M0 8 C 15 2, 25 14, 40 8 S 65 2, 80 8 S 105 14, 120 8 L120 16 L0 16 Z"
          fill={`url(#wave-grad-${flip ? "b" : "a"})`}
        />
      </svg>
    </div>
  );
}
