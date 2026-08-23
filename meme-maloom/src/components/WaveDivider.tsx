import { cn } from "@/lib/utils";

/** Decorative zigzag divider between alternating-tone homepage sections. */
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
      className={cn("relative h-6 overflow-hidden sm:h-8", className)}
    >
      <svg
        viewBox="0 0 120 12"
        preserveAspectRatio="none"
        className={cn("h-full w-full text-navy-950/[0.03]", flip && "rotate-180")}
      >
        <path
          d="M0 12 L10 3 L20 12 L30 3 L40 12 L50 3 L60 12 L70 3 L80 12 L90 3 L100 12 L110 3 L120 12 L120 12 L0 12 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
