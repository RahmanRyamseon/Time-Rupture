import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
      <div aria-hidden="true" className="bg-mesh-light pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="animate-blob pointer-events-none absolute top-[10%] left-[15%] h-56 w-56 bg-gradient-to-br from-violet-300/40 to-pink-300/40 blur-3xl"
      />
      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-4">
        <div className="glass flex h-20 w-20 items-center justify-center rounded-full text-5xl" aria-hidden="true">
          🤷
        </div>
        <h1 className="font-display text-gradient text-4xl font-bold">
          Iska matlab maloom nahi
        </h1>
        <p className="text-navy-600">
          (&ldquo;Don&apos;t know the meaning of this one.&rdquo;) The page you&apos;re
          looking for doesn&apos;t exist — but plenty of explained memes do.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            href="/"
            className="rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-glow-violet)] transition hover:-translate-y-0.5"
          >
            Back to home
          </Link>
          <Link
            href="/explore"
            className="rounded-full border-2 border-navy-900/15 px-5 py-2.5 text-sm font-bold text-navy-800 transition hover:border-violet-400"
          >
            Explore memes
          </Link>
        </div>
      </div>
    </div>
  );
}
