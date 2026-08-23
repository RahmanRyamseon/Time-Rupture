import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="text-6xl" aria-hidden="true">
        🤷
      </div>
      <h1 className="font-display text-3xl font-extrabold text-navy-900">
        Iska matlab maloom nahi
      </h1>
      <p className="text-navy-600">
        (&ldquo;Don&apos;t know the meaning of this one.&rdquo;) The page you&apos;re
        looking for doesn&apos;t exist — but plenty of explained memes do.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-saffron-600"
        >
          Back to home
        </Link>
        <Link
          href="/explore"
          className="rounded-full border-2 border-navy-900/15 px-5 py-2.5 text-sm font-bold text-navy-800 transition hover:border-saffron-500"
        >
          Explore memes
        </Link>
      </div>
    </div>
  );
}
