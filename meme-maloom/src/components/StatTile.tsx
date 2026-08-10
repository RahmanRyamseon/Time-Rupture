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
    <div className="rounded-3xl border-2 border-navy-900/10 bg-white p-5">
      <p className="text-xs font-bold tracking-wide text-navy-500 uppercase">{label}</p>
      <p className="font-display mt-1 text-3xl font-extrabold text-navy-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-navy-500">{hint}</p> : null}
    </div>
  );
}
