"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES, REGIONS, CATEGORIES } from "@/lib/types";

const inputClass =
  "w-full rounded-2xl border-2 border-navy-900/12 bg-white px-3 py-2 text-sm text-navy-900 outline-none placeholder:text-navy-400 transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15";

const MAX_FILE_MB = 4;

type Draft = {
  key: string;
  file: File;
  kind: "image" | "video" | "unsupported";
  previewUrl: string;
  title: string;
  description: string;
  explanation: string;
  sourceUrl: string;
  sourcePlatform: string;
  creator: string;
  language: string;
  region: string;
  category: string;
  originDate: string;
  originStory: string;
  culturalContext: string;
  tags: string;
};

function detectKind(file: File): "image" | "video" | "unsupported" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "unsupported";
}

function makeDraft(file: File, index: number): Draft {
  return {
    key: `file_${index}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    file,
    kind: detectKind(file),
    previewUrl: URL.createObjectURL(file),
    title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
    description: "",
    explanation: "",
    sourceUrl: "",
    sourcePlatform: "",
    creator: "",
    language: LANGUAGES[0],
    region: REGIONS[REGIONS.length - 1],
    category: CATEGORIES[CATEGORIES.length - 1],
    originDate: "",
    originStory: "",
    culturalContext: "",
    tags: "",
  };
}

export default function AdminUploadPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ added: { title: string; slug: string }[]; commitUrl: string } | null>(null);
  const [error, setError] = useState<string | { message: string; details?: string[] } | null>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const incoming = mode === "single" ? [fileList[0]] : Array.from(fileList);
      setDrafts((prev) => {
        const startIndex = prev.length;
        const next = incoming.map((f, i) => makeDraft(f, startIndex + i));
        return mode === "single" ? next : [...prev, ...next];
      });
      setResult(null);
      setError(null);
    },
    [mode]
  );

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }

  async function handleSubmit() {
    setError(null);
    setResult(null);

    if (drafts.length === 0) {
      setError("Add at least one file first.");
      return;
    }
    const unsupported = drafts.filter((d) => d.kind === "unsupported");
    if (unsupported.length > 0) {
      setError(`${unsupported.map((d) => d.file.name).join(", ")} isn't a recognised image or video file.`);
      return;
    }
    const missing = drafts.filter((d) => !d.title.trim() || !d.sourceUrl.trim() || !d.sourcePlatform.trim());
    if (missing.length > 0) {
      setError("Every item needs a title, source URL, and source platform.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      const items = drafts.map((d) => ({
        fileKey: d.key,
        title: d.title.trim(),
        description: d.description.trim() || undefined,
        explanation: d.explanation.trim() || undefined,
        sourceUrl: d.sourceUrl.trim(),
        sourcePlatform: d.sourcePlatform.trim(),
        creator: d.creator.trim() || undefined,
        language: d.language,
        region: d.region,
        category: d.category,
        originDate: d.originDate.trim() || undefined,
        originStory: d.originStory.trim() || undefined,
        culturalContext: d.culturalContext.trim() || undefined,
        tags: d.tags.trim() || undefined,
      }));
      formData.set("items", JSON.stringify(items));
      for (const d of drafts) formData.set(d.key, d.file);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError({ message: data.error || "Upload failed.", details: data.details });
        return;
      }

      setResult({ added: data.added, commitUrl: data.commitUrl });
      drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      setDrafts([]);
    } catch {
      setError("Network error — the upload didn't go through.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <div aria-hidden="true" className="bg-mesh-light pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" />
      <div className="relative mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-gradient uppercase">Admin only</p>
            <h1 className="font-display mt-1 text-3xl font-bold text-navy-900 sm:text-4xl">Upload memes</h1>
            <p className="mt-2 text-navy-600">
              Upload the real image or video for a meme, fill in its details, and publish. This
              commits directly to the live site (via a git commit), so a successful submit here
              means it&apos;s about to go live — there&apos;s no draft/review step.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-full border-2 border-navy-900/12 px-4 py-2 text-xs font-bold text-navy-700 transition hover:border-navy-900/25"
          >
            Log out
          </button>
        </header>

        <div className="mb-6 flex gap-2 rounded-full bg-navy-900/5 p-1 text-sm font-bold">
          <button
            onClick={() => setMode("single")}
            className={`flex-1 rounded-full px-4 py-2 transition ${mode === "single" ? "bg-white text-navy-900 shadow-card" : "text-navy-500"}`}
          >
            Single upload
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`flex-1 rounded-full px-4 py-2 transition ${mode === "bulk" ? "bg-white text-navy-900 shadow-card" : "text-navy-500"}`}
          >
            Bulk upload
          </button>
        </div>

        <label className="mb-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[28px] border-2 border-dashed border-navy-900/20 bg-white px-6 py-10 text-center transition hover:border-violet-400 hover:bg-violet-50/40">
          <span className="text-sm font-bold text-navy-800">
            {mode === "bulk" ? "Choose images/videos (multiple allowed)" : "Choose an image or video"}
          </span>
          <span className="text-xs text-navy-500">Image/video type is detected automatically · up to {MAX_FILE_MB}MB each</span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple={mode === "bulk"}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        {drafts.length > 0 ? (
          <div className="flex flex-col gap-6">
            {drafts.map((d) => (
              <div key={d.key} className="rounded-[28px] border-2 border-navy-900/10 bg-white p-5">
                <div className="mb-4 flex items-start gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-navy-950">
                    {d.kind === "video" ? (
                      <video src={d.previewUrl} className="h-full w-full object-cover" muted />
                    ) : d.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.previewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-white">Unsupported</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold tracking-wide text-violet-600 uppercase">
                      {d.kind === "unsupported" ? "Unsupported file" : `Detected: ${d.kind}`} ·{" "}
                      {(d.file.size / 1024 / 1024).toFixed(2)}MB
                    </p>
                    <p className="mt-0.5 truncate text-sm text-navy-500">{d.file.name}</p>
                  </div>
                  <button
                    onClick={() => removeDraft(d.key)}
                    className="shrink-0 rounded-full border-2 border-navy-900/12 px-3 py-1.5 text-xs font-bold text-navy-600 transition hover:border-pink-400 hover:text-pink-600"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder="Title *"
                    value={d.title}
                    onChange={(e) => updateDraft(d.key, { title: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="Source URL (the real original) *"
                    value={d.sourceUrl}
                    onChange={(e) => updateDraft(d.key, { sourceUrl: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="Source platform, e.g. Instagram *"
                    value={d.sourcePlatform}
                    onChange={(e) => updateDraft(d.key, { sourcePlatform: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    placeholder="Creator (optional)"
                    value={d.creator}
                    onChange={(e) => updateDraft(d.key, { creator: e.target.value })}
                  />
                  <select
                    className={inputClass}
                    value={d.language}
                    onChange={(e) => updateDraft(d.key, { language: e.target.value })}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClass}
                    value={d.region}
                    onChange={(e) => updateDraft(d.key, { region: e.target.value })}
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClass}
                    value={d.category}
                    onChange={(e) => updateDraft(d.key, { category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className={inputClass}
                    value={d.originDate}
                    onChange={(e) => updateDraft(d.key, { originDate: e.target.value })}
                  />
                  <textarea
                    className={`${inputClass} sm:col-span-2`}
                    rows={2}
                    placeholder="Description (one-line summary)"
                    value={d.description}
                    onChange={(e) => updateDraft(d.key, { description: e.target.value })}
                  />
                  <textarea
                    className={`${inputClass} sm:col-span-2`}
                    rows={2}
                    placeholder="Explanation (what it means / why it's funny)"
                    value={d.explanation}
                    onChange={(e) => updateDraft(d.key, { explanation: e.target.value })}
                  />
                  <textarea
                    className={`${inputClass} sm:col-span-2`}
                    rows={2}
                    placeholder="Origin story"
                    value={d.originStory}
                    onChange={(e) => updateDraft(d.key, { originStory: e.target.value })}
                  />
                  <textarea
                    className={`${inputClass} sm:col-span-2`}
                    rows={2}
                    placeholder="Cultural context"
                    value={d.culturalContext}
                    onChange={(e) => updateDraft(d.key, { culturalContext: e.target.value })}
                  />
                  <input
                    className={`${inputClass} sm:col-span-2`}
                    placeholder="Tags, comma-separated"
                    value={d.tags}
                    onChange={(e) => updateDraft(d.key, { tags: e.target.value })}
                  />
                </div>
              </div>
            ))}

            {error ? (
              <div className="rounded-2xl border-2 border-pink-300 bg-pink-50 p-4 text-sm font-semibold text-pink-700">
                {typeof error === "string" ? error : error.message}
                {typeof error !== "string" && error.details ? (
                  <ul className="mt-2 list-disc pl-5 font-normal">
                    {error.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-full bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Publishing…"
                : drafts.length > 1
                  ? `Publish ${drafts.length} memes`
                  : "Publish meme"}
            </button>
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 rounded-2xl border-2 border-mint-400/40 bg-mint-50 p-5">
            <p className="font-bold text-navy-900">
              Published {result.added.length} meme{result.added.length > 1 ? "s" : ""}.
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-navy-700">
              {result.added.map((a) => (
                <li key={a.slug}>{a.title}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-navy-500">
              This landed as a real commit —{" "}
              <a href={result.commitUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-violet-700 underline">
                view it on GitHub ↗
              </a>
              . The site will redeploy automatically; give it a couple of minutes before the new
              entries show up live.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
