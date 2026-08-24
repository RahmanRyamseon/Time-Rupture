"use client";

import { useId, useState } from "react";

const REASONS = [
  "I own the copyright to this content",
  "Remove the embedded media (keep the illustration only)",
  "Incorrect cultural context or translation",
  "Offensive or inappropriate content",
  "Duplicate entry",
  "Other",
];

export default function ReportButton({ memeTitle }: { memeTitle: string }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const reasonId = useId();
  const detailsId = useId();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-navy-900/15 px-4 py-2 text-sm font-bold text-navy-600 transition hover:border-pink-400 hover:text-pink-600"
      >
        Report or request removal
      </button>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border-2 border-navy-900/10 bg-white p-5">
      {submitted ? (
        <p role="status" className="text-sm font-semibold text-mint-600">
          Thanks — your report for &ldquo;{memeTitle}&rdquo; has been queued for our moderation
          team. We&apos;ll follow up by email if we need more details.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-navy-900">Report this entry</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close report form"
              className="text-navy-400 hover:text-navy-700"
            >
              ✕
            </button>
          </div>
          <label htmlFor={reasonId} className="text-xs font-semibold text-navy-600">
            Reason
          </label>
          <select
            id={reasonId}
            required
            className="rounded-xl border-2 border-navy-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-saffron-500"
          >
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <label htmlFor={detailsId} className="text-xs font-semibold text-navy-600">
            Additional details (optional)
          </label>
          <textarea
            id={detailsId}
            rows={3}
            className="rounded-xl border-2 border-navy-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-saffron-500"
            placeholder="Tell us more so our moderators can review faster..."
          />
          <button
            type="submit"
            className="mt-1 self-start rounded-full bg-pink-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pink-600"
          >
            Submit report
          </button>
        </form>
      )}
    </div>
  );
}
