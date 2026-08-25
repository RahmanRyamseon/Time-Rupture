import { cn } from "@/lib/utils";

type Tone = "saffron" | "navy" | "pink" | "mint" | "violet" | "lime" | "neutral";

const toneClasses: Record<Tone, string> = {
  saffron: "bg-saffron-100 text-saffron-800",
  navy: "bg-navy-900/8 text-navy-800",
  pink: "bg-pink-100 text-pink-700",
  mint: "bg-mint-100 text-mint-600",
  violet: "bg-violet-100 text-violet-700",
  lime: "bg-lime-400 text-navy-950",
  neutral: "bg-navy-900/5 text-navy-700",
};

export default function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
