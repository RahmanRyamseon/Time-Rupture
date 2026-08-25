"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { LANGUAGES, REGIONS, CATEGORIES } from "@/lib/types";

const inputClass =
  "w-full rounded-2xl border-2 border-navy-900/12 bg-white px-4 py-2.5 text-sm text-navy-900 outline-none placeholder:text-navy-400 transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15";

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-bold text-navy-800">
        {label} {required ? <span className="text-pink-600">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-navy-500">{hint}</p> : null}
    </div>
  );
}

export default function SubmitForm() {
  const [submitted, setSubmitted] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const ids = {
    title: useId(),
    description: useId(),
    language: useId(),
    region: useId(),
    category: useId(),
    sourceUrl: useId(),
    creator: useId(),
    context: useId(),
    upload: useId(),
    copyright: useId(),
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[28px] border-2 border-mint-400/40 bg-mint-50 px-6 py-14 text-center">
        <div
          aria-hidden="true"
          className="animate-blob absolute -top-16 -right-16 h-48 w-48 bg-gradient-to-br from-mint-400/30 to-violet-400/30 blur-3xl"
        />
        <div className="relative text-5xl" aria-hidden="true">
          🎉
        </div>
        <h2 className="font-display relative text-xl font-bold text-navy-900">
          Thanks — your submission is in the queue!
        </h2>
        <p className="relative max-w-md text-sm text-navy-600">
          Our editors review every submission for cultural accuracy,
          copyright and community guidelines before it goes live. You&apos;ll
          typically hear back within 3–5 days.
        </p>
        <div className="relative mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setFileName(null);
            }}
            className="rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5"
          >
            Submit another meme
          </button>
          <Link
            href="/explore"
            className="rounded-full border-2 border-navy-900/15 px-5 py-2.5 text-sm font-bold text-navy-800 transition hover:border-violet-400"
          >
            Browse memes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Meme title" htmlFor={ids.title} required>
        <input id={ids.title} required className={inputClass} placeholder="e.g. Vaathi Coming" />
      </Field>

      <Field label="Description" htmlFor={ids.description} required hint="A one- or two-line summary of the meme.">
        <textarea
          id={ids.description}
          required
          rows={3}
          className={inputClass}
          placeholder="What is this meme, in a sentence or two?"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Language" htmlFor={ids.language} required>
          <select id={ids.language} required className={inputClass} defaultValue="">
            <option value="" disabled>
              Select language
            </option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Region" htmlFor={ids.region} required>
          <select id={ids.region} required className={inputClass} defaultValue="">
            <option value="" disabled>
              Select region
            </option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category" htmlFor={ids.category} required>
          <select id={ids.category} required className={inputClass} defaultValue="">
            <option value="" disabled>
              Select category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Source URL"
        htmlFor={ids.sourceUrl}
        required
        hint="Link to where you first saw it — a post, video or article. We link out; we don't rehost."
      >
        <input
          id={ids.sourceUrl}
          type="url"
          required
          className={inputClass}
          placeholder="https://..."
        />
      </Field>

      <Field label="Creator name (optional)" htmlFor={ids.creator} hint="Credit the original creator if known.">
        <input id={ids.creator} className={inputClass} placeholder="@handle or full name" />
      </Field>

      <Field
        label="Explanation of the cultural reference"
        htmlFor={ids.context}
        required
        hint="Why is it funny? Where does it come from? The more context, the faster we can publish."
      >
        <textarea
          id={ids.context}
          required
          rows={5}
          className={inputClass}
          placeholder="Explain the origin, language and cultural context..."
        />
      </Field>

      <Field
        label="Upload reference image (optional)"
        htmlFor={ids.upload}
        hint="For internal review only — we do not publish uploaded media directly; published entries use labelled placeholders and a source link."
      >
        <label
          htmlFor={ids.upload}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy-900/20 bg-gradient-to-br from-violet-50 to-pink-50 px-4 py-8 text-center transition hover:border-violet-400"
        >
          <span className="text-3xl" aria-hidden="true">📎</span>
          <span className="text-sm font-semibold text-navy-700">
            {fileName ?? "Click to choose a file, or drag it here"}
          </span>
          <span className="text-xs text-navy-500">PNG, JPG, GIF or MP4 up to 10MB</span>
          <input
            id={ids.upload}
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      </Field>

      <div className="rounded-2xl border-2 border-navy-900/10 bg-navy-900/[0.03] p-4 text-xs text-navy-600">
        <p className="font-bold text-navy-800">Before you submit</p>
        <p className="mt-1">
          By submitting, you confirm your entry follows our{" "}
          <Link href="/community-guidelines" className="font-semibold text-violet-700 underline">
            Community Guidelines
          </Link>{" "}
          — no hate speech, harassment, misinformation or content that
          targets private individuals. All submissions are reviewed before
          publication.
        </p>
      </div>

      <label htmlFor={ids.copyright} className="flex items-start gap-3 text-sm text-navy-700">
        <input
          id={ids.copyright}
          type="checkbox"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-navy-900/30 text-violet-500 focus:ring-violet-500"
        />
        <span>
          I confirm I have the right to share this content, and that Meme
          Maloom will link to the original source rather than rehost the
          media. <span className="text-pink-600">*</span>
        </span>
      </label>

      <button
        type="submit"
        className="self-start rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-saffron-500 px-8 py-3 text-sm font-bold text-white shadow-[var(--shadow-glow-violet)] transition hover:-translate-y-0.5 active:translate-y-0"
      >
        Submit for review
      </button>
    </form>
  );
}
