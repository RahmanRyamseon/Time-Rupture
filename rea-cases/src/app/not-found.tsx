import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-3xl font-semibold">Nothing here</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-foreground/70">
        That case or page doesn&apos;t exist — it may have been renamed, or removed upstream after a
        takedown request.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
        <Link
          href="/browse"
          className="rounded-full bg-brand px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Browse every case
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border px-4 py-2 font-medium hover:bg-surface-muted"
        >
          Home
        </Link>
      </div>
    </section>
  );
}
