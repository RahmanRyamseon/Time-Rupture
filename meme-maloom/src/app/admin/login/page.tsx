"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Wrong password.");
        return;
      }
      const next = searchParams.get("next") || "/admin/upload";
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center px-4">
      <div aria-hidden="true" className="bg-mesh-light pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-[28px] border-2 border-navy-900/10 bg-white p-8 shadow-card"
      >
        <p className="text-xs font-bold tracking-widest text-gradient uppercase">Admin only</p>
        <h1 className="font-display mt-1 text-2xl font-bold text-navy-900">Meme Maloom admin</h1>
        <p className="mt-2 text-sm text-navy-600">
          This area is private. Enter the admin password to continue.
        </p>
        <div className="mt-6 flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-bold text-navy-800">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border-2 border-navy-900/12 bg-white px-4 py-2.5 text-sm text-navy-900 outline-none placeholder:text-navy-400 transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
          />
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-pink-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !password}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-violet-600 to-pink-600 px-5 py-3 text-sm font-bold text-white shadow-card transition hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
