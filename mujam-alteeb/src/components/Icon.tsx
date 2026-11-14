import type { SVGProps } from "react";

/** Inline icons. Directional icons carry the "flip-rtl" class so they mirror in Arabic. */
const PATHS: Record<string, string> = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16l-4.5-4.5",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  shelf: "M4 4h16v6H4z M4 14h16v6H4z M8 7h2 M8 17h2",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  chevron: "M15 6l-6 6 6 6",
  arrow: "M19 12H5 M11 6l-6 6 6 6",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18",
  plus: "M12 5v14 M5 12h14",
  check: "M5 12l5 5 9-10",
  flag: "M5 21V4 M5 4h11l-2 4 2 4H5",
  pen: "M4 20h4L19 9l-4-4L4 16z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2",
  scale: "M12 3v18 M5 7h14 M5 7l-3 7a4 4 0 0 0 6 0z M19 7l-3 7a4 4 0 0 0 6 0z",
  x: "M6 6l12 12 M18 6L6 18",
  download: "M12 4v12 M6 10l6 6 6-6 M4 20h16",
};

export function Icon({ name, className = "h-5 w-5", flip, ...rest }: { name: keyof typeof PATHS | string; flip?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`${className} ${flip ? "flip-rtl" : ""}`} {...rest}>
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  // A stylised mijmara (incense burner) under an eight-point star.
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <g fill="none" stroke="#c9a45c" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M24 3l3.2 6.8L34 13l-6.8 3.2L24 23l-3.2-6.8L14 13l6.8-3.2z" />
        <path d="M14 27h20l-3 7H17z" />
        <path d="M17 34l-2 9h18l-2-9" />
        <path d="M21 23c-1 1.5 1 2 0 4M27 23c-1 1.5 1 2 0 4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
