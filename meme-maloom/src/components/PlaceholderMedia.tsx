import { cn } from "@/lib/utils";

type Tone = "saffron" | "navy" | "pink" | "mint";

const toneGradients: Record<Tone, string> = {
  saffron: "from-saffron-300 via-saffron-400 to-saffron-600",
  navy: "from-navy-500 via-navy-700 to-navy-900",
  pink: "from-pink-400 via-pink-500 to-pink-600",
  mint: "from-mint-400 via-mint-500 to-mint-600",
};

function StickerIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="h-10 w-10 drop-shadow-sm"
      fill="none"
    >
      <rect x="4" y="10" width="56" height="44" rx="10" fill="white" fillOpacity="0.18" />
      <rect
        x="4"
        y="10"
        width="56"
        height="44"
        rx="10"
        stroke="white"
        strokeWidth="2.5"
        strokeOpacity="0.85"
      />
      <circle cx="20" cy="24" r="5" fill="white" fillOpacity="0.85" />
      <path
        d="M10 46l14-14 9 9 8-8 13 13"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.85"
      />
    </svg>
  );
}

export default function PlaceholderMedia({
  label,
  tone = "saffron",
  aspect = "video",
  contentType,
  className,
}: {
  label: string;
  tone?: Tone;
  aspect?: "video" | "square";
  contentType?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-center",
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
      <div className="relative flex flex-col items-center gap-2">
        <StickerIcon />
        <p className="max-w-[85%] text-xs font-semibold text-white/95 sm:text-sm">{label}</p>
      </div>
      <span className="absolute top-2 left-2 rounded-full bg-navy-900/50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
        Placeholder
      </span>
      {contentType ? (
        <span className="absolute top-2 right-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {contentType}
        </span>
      ) : null}
    </div>
  );
}
