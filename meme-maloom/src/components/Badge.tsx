import { cn } from "@/lib/utils";

type Tone = "saffron" | "navy" | "pink" | "mint" | "neutral";

const toneClasses: Record<Tone, string> = {
  saffron: "bg-saffron-100 text-saffron-800",
  navy: "bg-navy-100 text-navy-800",
  pink: "bg-pink-50 text-pink-600",
  mint: "bg-mint-50 text-mint-600",
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
