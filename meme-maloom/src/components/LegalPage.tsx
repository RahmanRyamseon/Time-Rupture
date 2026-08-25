export default function LegalPage({
  title,
  eyebrow,
  updated,
  children,
}: {
  title: string;
  eyebrow: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="text-xs font-bold tracking-widest text-violet-600 uppercase">{eyebrow}</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-navy-900 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-navy-500">Last updated: {updated}</p>
      <div className="prose-legal mt-8 flex flex-col gap-5 text-navy-700 [&_h2]:font-display [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-navy-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_a]:text-violet-700 [&_a]:font-semibold">
        {children}
      </div>
    </div>
  );
}
