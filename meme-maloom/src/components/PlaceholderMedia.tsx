import { cn } from "@/lib/utils";
import { ICONS, resolveIllustrationIcon } from "./illustrations";
import type { Category, IllustrationIcon } from "@/lib/types";

type Tone = "saffron" | "navy" | "pink" | "mint";

const toneGradients: Record<Tone, string> = {
  saffron: "from-saffron-300 via-saffron-400 to-saffron-600",
  navy: "from-navy-500 via-navy-700 to-navy-900",
  pink: "from-pink-400 via-pink-500 to-pink-600",
  mint: "from-mint-400 via-mint-500 to-mint-600",
};

export default function PlaceholderMedia({
  label,
  tone = "saffron",
  aspect = "video",
  contentType,
  icon,
  category,
  className,
}: {
  label: string;
  tone?: Tone;
  aspect?: "video" | "square";
  contentType?: string;
  icon?: IllustrationIcon;
  category?: Category;
  className?: string;
}) {
  const iconKey = resolveIllustrationIcon(icon, category ?? "Internet Slang");
  const Icon = ICONS[iconKey];

  return (
    <div
      className={cn(
        "relative isolate flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-center",
        toneGradients[tone],
        aspect === "video" ? "aspect-video" : "aspect-square",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 2px, transparent 2px, transparent 14px)",
        }}
      />
      <div className="relative flex flex-col items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
          <Icon />
        </div>
        <p className="max-w-[85%] text-xs font-semibold text-white/95 sm:text-sm">{label}</p>
      </div>
      <span className="absolute top-2 left-2 rounded-full bg-navy-900/50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
        Original illustration
      </span>
      {contentType ? (
        <span className="absolute top-2 right-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {contentType}
        </span>
      ) : null}
    </div>
  );
}
