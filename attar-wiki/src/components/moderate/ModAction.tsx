"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Small POST button for moderation actions; refreshes the page on success. */
export function ModAction({
  url,
  body,
  label,
  variant = "secondary",
  withNote = false,
  notePlaceholder,
}: {
  url: string;
  body: Record<string, unknown>;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  withNote?: boolean;
  notePlaceholder?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const cls = variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-secondary text-danger" : "btn-secondary";
  return (
    <div className="flex flex-col gap-2">
      {withNote ? (
        <input className="input" placeholder={notePlaceholder} aria-label={notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
      ) : null}
      <button
        type="button"
        className={cls}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(withNote ? { ...body, note: note || undefined } : body),
          }).catch(() => null);
          setBusy(false);
          if (res?.ok) router.refresh();
          else setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "Error");
        }}
      >
        {label}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
