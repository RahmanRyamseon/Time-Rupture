export function PageHeader({ title, intro, eyebrow, children }: { title: string; intro?: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 space-y-3">
      {eyebrow && <p className="text-sm text-gold-400">{eyebrow}</p>}
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      {intro && <p className="max-w-3xl text-lg text-sand-300">{intro}</p>}
      {children}
    </header>
  );
}
