"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    // Supabase Auth enforces its own login rate limiting server-side —
    // no separate client-side throttling is needed here.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (signInError) {
      setError("Wrong email or password.");
      return;
    }

    router.push(searchParams.get("next") || "/upload");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ width: 340, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
        <div style={{ width: 28, height: 28, border: "1.5px solid var(--brand-soft)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13, color: "var(--brand)" }}>
          VC
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Bahrain VAT Compliance</div>
          <div style={{ fontSize: 10.5, color: "var(--muted-soft)" }}>Sign in to your workpaper</div>
        </div>
      </div>

      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>Email</label>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 5, padding: "8px 10px", marginBottom: 14, fontSize: 13 }}
      />

      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>Password</label>
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 5, padding: "8px 10px", marginBottom: 14, fontSize: 13 }}
      />

      {error && (
        <div style={{ background: "var(--danger-soft)", color: "var(--danger)", fontSize: 11.5, borderRadius: 5, padding: "8px 10px", marginBottom: 14 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{ width: "100%", background: "var(--masthead)", color: "#eef0f3", border: "none", borderRadius: 5, padding: "9px 0", fontWeight: 600, fontSize: 12.5, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--muted)", textAlign: "center" }}>
        No account? <Link href="/signup">Sign up</Link>
      </div>
    </form>
  );
}
