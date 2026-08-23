/**
 * Original, hand-drawn-style line icons used on meme placeholder cards.
 * These are illustrative stand-ins for a meme's vibe — never a reproduction
 * of the actual copyrighted media. See PlaceholderMedia + the meme detail
 * page's "View original source" link for where the real thing lives.
 */

import type { Category, IllustrationIcon } from "@/lib/types";

const stroke = {
  fill: "none" as const,
  stroke: "white" as const,
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Crown({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M10 44 L14 22 L26 34 L32 16 L38 34 L50 22 L54 44 Z" />
      <path d="M10 44 L54 44 L54 50 L10 50 Z" />
    </svg>
  );
}

function Mask({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M12 26c0-8 9-14 20-14s20 6 20 14-9 20-20 20-20-12-20-20Z" />
      <circle cx="24" cy="28" r="2.5" fill="white" stroke="none" />
      <circle cx="40" cy="28" r="2.5" fill="white" stroke="none" />
      <path d="M24 38c3 3 13 3 16 0" />
    </svg>
  );
}

function CricketBat({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M40 12 L52 24 L30 46 L18 34 Z" />
      <path d="M18 34 L11 41" />
      <circle cx="46" cy="46" r="6" />
    </svg>
  );
}

function Laptop({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <rect x="14" y="16" width="36" height="24" rx="3" />
      <path d="M8 46 L56 46 L52 40 L12 40 Z" />
      <path d="M20 8c4 3 4 5 0 8" />
    </svg>
  );
}

function Chalkboard({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <rect x="10" y="12" width="44" height="30" rx="3" />
      <path d="M18 20 L34 20 M18 27 L28 27" />
      <path d="M24 42 L24 50 M40 42 L40 50" />
    </svg>
  );
}

function Mic({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <rect x="26" y="8" width="12" height="24" rx="6" />
      <path d="M18 28c0 8 6 14 14 14s14-6 14-14" />
      <path d="M32 42 L32 54 M22 54 L42 54" />
    </svg>
  );
}

function Podium({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M18 56 L22 30 L42 30 L46 56 Z" />
      <rect x="28" y="12" width="8" height="10" rx="2" />
      <path d="M14 56 L50 56" />
    </svg>
  );
}

function Thali({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="9" />
      <circle cx="18" cy="20" r="4" />
      <circle cx="46" cy="20" r="4" />
      <circle cx="18" cy="44" r="4" />
      <circle cx="46" cy="44" r="4" />
    </svg>
  );
}

function Fireworks({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M32 10 L32 22 M32 42 L32 54 M10 32 L22 32 M42 32 L54 32" />
      <path d="M17 17 L25 25 M39 39 L47 47 M47 17 L39 25 M25 39 L17 47" />
      <circle cx="32" cy="32" r="6" />
    </svg>
  );
}

function ThumbsChat({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M10 14h30a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H24l-8 8v-8h-6a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" />
      <path d="M22 34 V26 a3 3 0 0 1 3-3 h1 l4-7 a2 2 0 0 1 4 1 l-1 6 h6 a3 3 0 0 1 3 3.5 l-1.5 8 a3 3 0 0 1-3 2.5 h-12 Z" />
    </svg>
  );
}

function GameController({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M16 24h32a10 10 0 0 1 10 10v6a6 6 0 0 1-11 3l-3-4H20l-3 4a6 6 0 0 1-11-3v-6a10 10 0 0 1 10-10Z" />
      <path d="M22 30 L22 38 M18 34 L26 34" />
      <circle cx="42" cy="30" r="1.5" fill="white" stroke="none" />
      <circle cx="47" cy="35" r="1.5" fill="white" stroke="none" />
    </svg>
  );
}

function ChatBubbles({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M8 14h28a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H20l-7 6v-6h-5a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" />
      <path d="M32 34h16a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-2v6l-6-6H32a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4Z" />
    </svg>
  );
}

function DanceFigure({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <circle cx="32" cy="14" r="6" />
      <path d="M32 20 L32 38 M32 24 L18 16 M32 24 L48 32 M32 38 L20 54 M32 38 L44 50" />
    </svg>
  );
}

function Dhol({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <ellipse cx="32" cy="20" rx="16" ry="7" />
      <ellipse cx="32" cy="44" rx="16" ry="7" />
      <path d="M16 20 L16 44 M48 20 L48 44" />
      <path d="M20 22 L44 42 M44 22 L20 42" />
    </svg>
  );
}

function CookingPot({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M14 28h36l-3 20a4 4 0 0 1-4 3.5H21a4 4 0 0 1-4-3.5Z" />
      <path d="M10 28 L54 28 M20 28 V22 a2 2 0 0 1 2-2 M44 28 V22 a2 2 0 0 0-2-2" />
      <path d="M26 10c2 2 2 4 0 6 M34 10c2 2 2 4 0 6" />
    </svg>
  );
}

function ShockedFace({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <circle cx="32" cy="32" r="20" />
      <circle cx="24" cy="28" r="3" fill="white" stroke="none" />
      <circle cx="40" cy="28" r="3" fill="white" stroke="none" />
      <ellipse cx="32" cy="42" rx="5" ry="6" />
    </svg>
  );
}

function Trophy({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M20 12h24v14a12 12 0 0 1-24 0Z" />
      <path d="M20 16h-6a6 6 0 0 0 6 10 M44 16h6a6 6 0 0 1-6 10" />
      <path d="M32 38 L32 46 M22 54 L42 54 L40 46 L24 46 Z" />
    </svg>
  );
}

function Sword({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M18 46 L42 22 L48 28 L24 52 Z" />
      <path d="M14 50 L18 46 M32 32 L16 16" />
      <path d="M12 42 L22 52" />
    </svg>
  );
}

function TvFrame({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <rect x="10" y="14" width="44" height="30" rx="3" />
      <path d="M24 50 L40 50 M32 44 L32 50" />
      <circle cx="20" cy="24" r="3" />
      <path d="M30 20 L46 20 M30 28 L42 28" />
    </svg>
  );
}

function TrainHeart({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <rect x="12" y="18" width="30" height="20" rx="4" />
      <path d="M12 30 L42 30 M20 38 L16 46 M34 38 L38 46" />
      <path d="M50 24c3-4 9-2 9 2 0 4-9 10-9 10s-9-6-9-10c0-4 6-6 9-2Z" />
    </svg>
  );
}

function ChartTicker({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M10 46 L22 30 L30 38 L42 18 L54 26" />
      <path d="M46 18 L54 18 L54 26" />
      <path d="M10 52 L54 52" />
    </svg>
  );
}

function Pickaxe({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <path d="M14 18c8-6 20-6 28 2 M42 20l10-8" />
      <path d="M30 26 L14 46" />
      <path d="M10 50 L16 44" />
    </svg>
  );
}

function Magnifier({ className }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-14 w-14"} {...stroke}>
      <circle cx="28" cy="28" r="14" />
      <path d="M38 38 L52 52" />
    </svg>
  );
}

export const ICONS: Record<
  IllustrationIcon,
  (props?: { className?: string }) => React.JSX.Element
> = {
  crown: Crown,
  mask: Mask,
  cricketBat: CricketBat,
  laptop: Laptop,
  chalkboard: Chalkboard,
  mic: Mic,
  podium: Podium,
  thali: Thali,
  fireworks: Fireworks,
  thumbsChat: ThumbsChat,
  gameController: GameController,
  chatBubbles: ChatBubbles,
  danceFigure: DanceFigure,
  dhol: Dhol,
  cookingPot: CookingPot,
  shockedFace: ShockedFace,
  trophy: Trophy,
  sword: Sword,
  tvFrame: TvFrame,
  trainHeart: TrainHeart,
  chartTicker: ChartTicker,
  pickaxe: Pickaxe,
  magnifier: Magnifier,
};

const CATEGORY_ICON_FALLBACK: Record<Category, IllustrationIcon> = {
  Bollywood: "crown",
  Cricket: "cricketBat",
  Politics: "podium",
  "College Life": "chalkboard",
  "Office Life": "laptop",
  Relationships: "chatBubbles",
  Food: "thali",
  Festivals: "fireworks",
  Gaming: "gameController",
  "Internet Slang": "thumbsChat",
};

export function resolveIllustrationIcon(
  icon: IllustrationIcon | undefined,
  category: Category
): IllustrationIcon {
  return icon ?? CATEGORY_ICON_FALLBACK[category] ?? "thumbsChat";
}
