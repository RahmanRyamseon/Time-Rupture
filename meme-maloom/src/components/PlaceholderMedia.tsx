import { cn } from "@/lib/utils";
import { ICONS, resolveIllustrationIcon } from "./illustrations";
import type { Category, IllustrationIcon } from "@/lib/types";

type Tone = "saffron" | "navy" | "pink" | "mint";

const toneGradients: Record<Tone, string> = {
  saffron: "from-saffron-300 via-saffron-500 to-pink-600",
  navy: "from-violet-500 via-navy-700 to-navy-950",
  pink: "from-pink-400 via-pink-500 to-violet-600",
  mint: "from-mint-400 via-mint-500 to-violet-500",
};

export default function PlaceholderMedia({
  label,
  tone = "saffron",
  aspect = "video",
  contentType,
  icon,
  category,
  className,
  /** When set, the whole media area becomes a link straight to the real
   * photo/video on the original platform — opens in a new tab, never
   * downloads or embeds it here. Only pass this where PlaceholderMedia
   * isn't already nested inside another link (e.g. not inside MemeCard). */
  linkHref,
}: {
  label: string;
  tone?: Tone;
  aspect?: "video" | "square";
  contentType?: string;
  icon?: IllustrationIcon;
  category?: Category;
  className?: string;
  linkHref?: string;
}) {
  const iconKey = resolveIllustrationIcon(icon, category ?? "Internet Slang");
  const Icon = ICONS[iconKey];

  const Wrapper = linkHref ? "a" : "div";
  const linkProps = linkHref
    ? { href: linkHref, target: "_blank", rel: "noopener noreferrer" as const }
    : {};

  return (
    <Wrapper
      {...linkProps}
      className={cn(
        "group/media relative isolate flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px] bg-gradient-to-br p-4 text-center",
        toneGradients[tone],
        aspect === "video" ? "aspect-video" : "aspect-square",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 2px, transparent 2px, transparent 16px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/15 blur-2xl transition-transform duration-500 group-hover/media:scale-125"
      />
      <div className={cn("relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2", linkHref && "pb-7")}>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-sm transition-transform duration-300 group-hover/media:scale-110 group-hover/media:rotate-3 sm:h-20 sm:w-20">
          <Icon />
        </div>
        <p className="max-w-[85%] text-xs font-semibold text-white/95 sm:text-sm">{label}</p>
      </div>
      <span className="glass-dark absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
        Original illustration
      </span>
      {contentType ? (
        <span className="absolute top-2 right-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {contentType}
        </span>
      ) : null}
      {linkHref ? (
        // Pinned to the box's own bottom edge (not part of the centered
        // content stack above) so it always renders fully, even in a short
        // card-grid tile — never gets squeezed out or clipped.
        <span className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1.5 bg-navy-950/70 py-2 text-xs font-bold text-white backdrop-blur-sm transition-colors duration-300 group-hover/media:bg-navy-950/85">
          View the real photo/video ↗
        </span>
      ) : null}
    </Wrapper>
  );
}
