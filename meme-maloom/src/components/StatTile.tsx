export default function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-navy-900/8 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      <div
        aria-hidden="true"
        className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-violet-400/20 to-pink-400/20 blur-2xl transition-transform duration-500 group-hover:scale-125"
      />
      <p className="relative text-xs font-bold tracking-wide text-navy-500 uppercase">{label}</p>
      <p className="font-display text-gradient relative mt-1 text-3xl font-bold">{value}</p>
      {hint ? <p className="relative mt-1 text-xs text-navy-500">{hint}</p> : null}
    </div>
  );
}
