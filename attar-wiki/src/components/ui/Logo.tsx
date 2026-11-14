export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="112" fill="#3b2414" />
      <g fill="none" stroke="#c9a24a" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round">
        <path d="M256 92c-18 26-18 44 0 62 18-18 18-36 0-62z" fill="#c9a24a" />
        <path d="M226 170h60M234 170v34c-52 18-86 62-86 112 0 62 48 104 108 104s108-42 108-104c0-50-34-94-86-112v-34" />
      </g>
    </svg>
  );
}
