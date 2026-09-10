"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWorkpaper } from "@/lib/workpaper/context";

const NAV_ITEMS = [
  { href: "/upload", label: "Data Sources" },
  { href: "/input", label: "Input VAT" },
  { href: "/output", label: "Output VAT" },
  { href: "/classify", label: "Rate vs Nature (AI)" },
  { href: "/return", label: "VAT Return" },
  { href: "/capital", label: "Capital Assets" },
  { href: "/exceptions", label: "Exceptions" },
];

export default function Shell({ email, isAdmin, children }: { email: string; isAdmin: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { periodLabel, currency, apRows, arRows } = useWorkpaper();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const todayLabel = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const items = isAdmin ? [...NAV_ITEMS, { href: "/admin", label: "Admin — All Workpapers" }] : NAV_ITEMS;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%", overflow: "hidden", background: "var(--background)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "var(--masthead)",
          color: "#eef0f3",
          padding: "0 18px",
          height: 52,
          flex: "0 0 auto",
          borderBottom: "2px solid var(--brand)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 26,
              height: 26,
              border: "1.5px solid var(--brand-soft)",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 13,
              color: "var(--brand-soft)",
            }}
          >
            VC
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, letterSpacing: 0.2 }}>Bahrain VAT Compliance Verification</div>
            <div style={{ fontSize: 10.5, color: "#8a929c", fontFamily: "var(--font-mono)" }}>
              Internal Audit Workpaper — Decree-Law 48/2018 · Executive Regulations · NBR
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "var(--font-mono)", fontSize: 11, color: "#9aa2ac" }}>
          <span>
            Period <b style={{ color: "#dfe3e8", fontWeight: 500 }}>{periodLabel}</b>
          </span>
          <span style={{ width: 1, height: 20, background: "#3a4148" }} />
          <span>
            Currency <b style={{ color: "#dfe3e8", fontWeight: 500 }}>{currency}</b>
          </span>
          <span style={{ width: 1, height: 20, background: "#3a4148" }} />
          <span>
            Prepared <b style={{ color: "#dfe3e8", fontWeight: 500 }}>{todayLabel}</b>
          </span>
          <span style={{ width: 1, height: 20, background: "#3a4148" }} />
          <span title={email}>{email}</span>
          <button
            onClick={onSignOut}
            disabled={signingOut}
            style={{ background: "none", border: "1px solid #3a4148", color: "#dfe3e8", borderRadius: 4, padding: "4px 9px", fontSize: 10.5, cursor: "pointer" }}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <nav style={{ flex: "0 0 232px", background: "var(--sidebar)", color: "#c4cad2", overflowY: "auto", padding: "10px 0", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 9.5, letterSpacing: 1.4, color: "#6d757e", fontWeight: 600, padding: "8px 18px 6px" }}>WORKPAPER SECTIONS</div>
          {items.map((item) => {
            const active = pathname === item.href;
            const count = item.href === "/input" ? apRows.length : item.href === "/output" ? arRows.length : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 18px",
                  fontSize: 12,
                  color: active ? "#eef0f3" : "#c4cad2",
                  background: active ? "#2a3038" : "transparent",
                  borderLeft: active ? "2px solid var(--brand-soft)" : "2px solid transparent",
                  textDecoration: "none",
                }}
              >
                <span style={{ flex: 1 }}>{item.label}</span>
                {count !== null && count > 0 && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#8a929c" }}>{count}</span>
                )}
              </Link>
            );
          })}
          <div style={{ flex: 1 }} />
          <div style={{ padding: "12px 18px", borderTop: "1px solid #2e343b", marginTop: 8 }}>
            <div style={{ fontSize: 9.5, letterSpacing: 1.2, color: "#6d757e", fontWeight: 600, marginBottom: 7 }}>AUTHORITATIVE SOURCES</div>
            <div style={{ fontSize: 10.5, color: "#8a929c", lineHeight: 1.7, fontFamily: "var(--font-mono)" }}>
              <div>VAT Decree-Law 48/2018</div>
              <div>Executive Regulations</div>
              <div>NBR Zero-rated Food List</div>
            </div>
          </div>
        </nav>

        <main style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "var(--background)" }}>{children}</main>
      </div>
    </div>
  );
}
