import { useEffect, useState } from "react";
import { useStore } from "./lib/store";
import type { TKey } from "./lib/i18n";
import Dashboard from "./pages/Dashboard";
import Capture from "./pages/Capture";
import Bank from "./pages/Bank";
import Manual from "./pages/Manual";
import { Journal, Ledger, Statements, TrialBalance, Vat } from "./pages/Reports";
import Accounts from "./pages/Accounts";
import Settings from "./pages/Settings";

const NAV: [string, TKey, string][] = [
  ["dashboard", "dashboard", "◧"],
  ["capture", "capture", "⎙"],
  ["bank", "bank", "🏦"],
  ["manual", "manual", "✎"],
  ["journal", "journal", "☰"],
  ["ledger", "ledger", "📒"],
  ["tb", "trialBalance", "⚖"],
  ["statements", "statements", "📊"],
  ["vat", "vat", "%"],
  ["accounts", "accounts", "#"],
  ["settings", "settings", "⚙"],
];

const parseHash = () => {
  const [page, arg] = location.hash.replace(/^#\/?/, "").split("/");
  return { page: page || "dashboard", arg };
};

export default function App() {
  const { ready, t, lang, setSettings, books } = useStore();
  const [route, setRoute] = useState(parseHash);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const h = () => { setRoute(parseHash()); setMenu(false); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const go = (p: string) => { location.hash = `#/${p}`; };

  if (!ready) return <div className="loading">Mizan · ميزان …</div>;

  const page = (() => {
    switch (route.page) {
      case "capture": return <Capture />;
      case "bank": return <Bank />;
      case "manual": return <Manual key={route.arg ?? "new"} editId={route.arg} onDone={() => go("journal")} />;
      case "journal": return <Journal onEdit={(id) => go(`manual/${id}`)} />;
      case "ledger": return <Ledger />;
      case "tb": return <TrialBalance />;
      case "statements": return <Statements />;
      case "vat": return <Vat />;
      case "accounts": return <Accounts />;
      case "settings": return <Settings />;
      default: return <Dashboard go={go} />;
    }
  })();

  return (
    <div className="app">
      <aside className={`sidebar no-print ${menu ? "open" : ""}`}>
        <div className="brand">
          <span className="logo">⚖</span>
          <div><div className="brand-name">{t("appName")}</div><div className="brand-co">{lang === "ar" && books.company.nameAr ? books.company.nameAr : books.company.name}</div></div>
        </div>
        <nav>
          {NAV.map(([id, key, icon]) => (
            <a key={id} href={`#/${id}`} className={route.page === id || (id === "dashboard" && !NAV.some((n) => n[0] === route.page)) ? "active" : ""}>
              <span className="ico">{icon}</span>{t(key)}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">{t("tagline")}</div>
      </aside>
      <main>
        <header className="topbar no-print">
          <button className="ghost menu-btn" onClick={() => setMenu(!menu)} aria-label="menu">☰</button>
          <h1>{t((NAV.find((n) => n[0] === route.page)?.[1] ?? "dashboard") as TKey)}</h1>
          <button className="lang" onClick={() => setSettings({ lang: lang === "ar" ? "en" : "ar" })}>{lang === "ar" ? "English" : "العربية"}</button>
        </header>
        {page}
      </main>
    </div>
  );
}
