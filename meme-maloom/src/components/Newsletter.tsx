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
    <div className="relative overflow-hidden rounded-[32px] bg-navy-950 px-6 py-10 text-center sm:px-12 sm:py-14">
      <div aria-hidden="true" className="bg-mesh pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="animate-blob absolute -top-20 -left-20 h-64 w-64 bg-gradient-to-br from-violet-500/40 to-pink-500/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="animate-blob absolute -right-16 -bottom-16 h-56 w-56 bg-gradient-to-br from-saffron-500/30 to-pink-500/30 blur-3xl"
        style={{ animationDelay: "3s" }}
      />
      <div className="relative mx-auto max-w-xl">
        <span className="glass-dark inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-lime-300 uppercase tracking-wide">
          ✉️ Weekly drop
        </span>
        <p className="font-display mt-3 text-2xl font-bold text-white sm:text-3xl">
          Get the weekly Maloom Digest
        </p>
        <p className="mt-2 text-sm text-navy-200 sm:text-base">
          The week&apos;s trending memes, explained in two minutes. No spam, just{" "}
          <span className="text-lime-400">samajh</span> (understanding).
        </p>

        {status === "success" ? (
          <p
            role="status"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-mint-500 to-violet-500 px-5 py-3 text-sm font-bold text-white"
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
              className="min-w-0 flex-1 rounded-full border-2 border-transparent bg-white px-4 py-3 text-sm text-navy-900 outline-none placeholder:text-navy-400 focus:border-lime-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 active:scale-95"
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
