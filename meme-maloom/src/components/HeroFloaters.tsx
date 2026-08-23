import { ICONS } from "./illustrations";
import type { IllustrationIcon } from "@/lib/types";

const toneBg: Record<string, string> = {
  saffron: "bg-saffron-500",
  navy: "bg-navy-700",
  pink: "bg-pink-500",
  mint: "bg-mint-500",
};

const floaters: {
  icon: IllustrationIcon;
  tone: keyof typeof toneBg;
  className: string;
  size: string;
  rotate: string;
  duration: string;
  delay: string;
}[] = [
  { icon: "mic", tone: "pink", className: "left-[4%] top-[18%]", size: "h-14 w-14", rotate: "-8deg", duration: "7s", delay: "0s" },
  { icon: "crown", tone: "saffron", className: "right-[6%] top-[12%]", size: "h-16 w-16", rotate: "10deg", duration: "8s", delay: "0.4s" },
  { icon: "fireworks", tone: "mint", className: "left-[10%] top-[62%]", size: "h-12 w-12", rotate: "6deg", duration: "6.5s", delay: "1s" },
  { icon: "dhol", tone: "navy", className: "right-[10%] top-[60%]", size: "h-14 w-14", rotate: "-6deg", duration: "7.5s", delay: "0.6s" },
  { icon: "chatBubbles", tone: "pink", className: "left-[22%] top-[8%]", size: "h-10 w-10", rotate: "-4deg", duration: "5.5s", delay: "1.4s" },
  { icon: "gameController", tone: "mint", className: "right-[22%] top-[74%]", size: "h-11 w-11", rotate: "5deg", duration: "6.8s", delay: "0.2s" },
];

export default function HeroFloaters() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden sm:block">
      {floaters.map((f, i) => {
        const Icon = ICONS[f.icon];
        return (
          <div
            key={i}
            className={`animate-float absolute ${f.className} ${f.size} ${toneBg[f.tone]} flex items-center justify-center rounded-2xl shadow-lg ring-4 ring-white/40 opacity-90`}
            style={
              {
                "--float-rot": f.rotate,
                "--float-duration": f.duration,
                "--float-delay": f.delay,
              } as React.CSSProperties
            }
          >
            <Icon className="h-2/3 w-2/3" />
          </div>
        );
      })}
    </div>
  );
}
