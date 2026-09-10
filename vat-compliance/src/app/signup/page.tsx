"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 12;

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (signUpError) {
      setError("Could not create the account. Try a different email or password.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{ width: 340, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 28, textAlign: "center" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Check your inbox</div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
            We sent a confirmation link to <b>{email}</b>. Confirm it, then{" "}
            <Link href="/login">sign in</Link>.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
      <form onSubmit={onSubmit} style={{ width: 340, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 28, height: 28, border: "1.5px solid var(--brand-soft)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13, color: "var(--brand)" }}>
            VC
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Create an account</div>
            <div style={{ fontSize: 10.5, color: "var(--muted-soft)" }}>Bahrain VAT Compliance</div>
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

        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
          Password <span style={{ fontWeight: 400, color: "var(--muted-soft)" }}>({MIN_PASSWORD_LENGTH}+ characters)</span>
        </label>
        <input
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
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
          {loading ? "Creating account…" : "Sign up"}
        </button>

        <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--muted)", textAlign: "center" }}>
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </form>
    </main>
  );
}
