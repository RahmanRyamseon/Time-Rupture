"use client";

import { useRef, useState } from "react";
import { addSubmission } from "@/lib/adminStore";

interface Props {
  triggerLabel: string;
  title: string;
  description: string;
  fields: { name: string; label: string; type?: "text" | "url" | "textarea"; required?: boolean }[];
  submissionType?: "suggestion" | "report";
  opportunityId?: string;
  opportunityTitle?: string;
}

export default function FeedbackDialog({
  triggerLabel,
  title,
  description,
  fields,
  submissionType = "suggestion",
  opportunityId,
  opportunityTitle,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fields.forEach((f) => {
      data[f.name] = String(formData.get(f.name) ?? "");
    });
    // Demo-only: stored in this browser's localStorage so the admin panel can
    // demonstrate a moderation queue. A production deployment would send this
    // to a real backend instead.
    addSubmission({ type: submissionType, opportunityId, opportunityTitle, data });
    setSubmitted(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSubmitted(false);
          dialogRef.current?.showModal();
        }}
        className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-medium hover:bg-black/5"
      >
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-0 text-[var(--foreground)] backdrop:bg-black/50"
      >
        <div className="p-5">
          {submitted ? (
            <>
              <h2 className="mb-2 text-base font-bold">Thank you</h2>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                Your submission has been noted. This demo build does not yet send it to a live moderation queue — a
                production deployment would route this to the admin panel for review.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="rounded-md bg-[var(--color-teal)] px-3 py-2 text-sm font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="mb-1 text-base font-bold">{title}</h2>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{description}</p>
              <div className="space-y-3">
                {fields.map((f) => (
                  <label key={f.name} className="block text-sm">
                    <span className="mb-1 block font-medium">{f.label}</span>
                    {f.type === "textarea" ? (
                      <textarea
                        name={f.name}
                        required={f.required}
                        rows={3}
                        className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                      />
                    ) : (
                      <input
                        name={f.name}
                        type={f.type ?? "text"}
                        required={f.required}
                        className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-md bg-[var(--color-teal)] px-3 py-2 text-sm font-semibold text-white">
                  Submit
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
