const toneClasses = {
  saffron: "from-saffron-400 to-pink-500",
  navy: "from-navy-600 to-violet-600",
  pink: "from-pink-400 to-violet-500",
  mint: "from-mint-400 to-mint-600",
  violet: "from-violet-400 to-pink-500",
} as const;

export default function StatBar({
  label,
  count,
  max,
  tone = "saffron",
}: {
  label: string;
  count: number;
  max: number;
  tone?: keyof typeof toneClasses;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm font-semibold text-navy-700" title={label}>
        {label}
      </span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-navy-900/8">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out ${toneClasses[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-bold text-navy-500">{count}</span>
    </div>
  );
}
