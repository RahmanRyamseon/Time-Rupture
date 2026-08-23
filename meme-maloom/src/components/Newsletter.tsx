"use client";

import { useId, useState } from "react";

export default function Newsletter() {
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const inputId = useId();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("success");
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-10 text-center sm:px-12 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-dot-grid opacity-[0.15]"
      />
      <div className="relative mx-auto max-w-xl">
        <p className="font-display text-2xl font-extrabold text-white sm:text-3xl">
          Get the weekly Maloom Digest
        </p>
        <p className="mt-2 text-sm text-navy-200 sm:text-base">
          The week&apos;s trending memes, explained in two minutes. No spam, just{" "}
          <span className="text-saffron-400">samajh</span> (understanding).
        </p>

        {status === "success" ? (
          <p
            role="status"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-mint-500 px-5 py-3 text-sm font-bold text-white"
          >
            You&apos;re in! Check your inbox for a confirmation email.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
          >
            <label htmlFor={inputId} className="sr-only">
              Email address
            </label>
            <input
              id={inputId}
              type="email"
              required
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-full border-2 border-transparent bg-white px-4 py-3 text-sm text-navy-900 outline-none placeholder:text-navy-400 focus:border-saffron-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-saffron-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-saffron-400 active:scale-95"
            >
              Subscribe
            </button>
          </form>
        )}
        <p className="mt-3 text-xs text-navy-400">
          Demo form — no data leaves your browser in this prototype.
        </p>
      </div>
    </div>
  );
}
