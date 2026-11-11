import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { api } from "./api";
import LoginPage from "./pages/LoginPage";
import ProjectPage from "./pages/ProjectPage";
import ProjectsPage from "./pages/ProjectsPage";
import SitePage from "./pages/SitePage";
import UsersPage from "./pages/UsersPage";
import { SessionContext } from "./session";
import type { AppConfig, User } from "./types";

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  return (
    <button
      className="link"
      onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar")}
    >
      {t("common.language")}
    </button>
  );
}

export default function App() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AppConfig | null>(null);
  // undefined = still checking the session, null = signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    api.get<AppConfig>("/config").then((c) => {
      setConfig(c);
      document.title = c.app_name;
    });
    api
      .get<User>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const signOut = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
  }, []);

  if (!config || user === undefined) return <p className="center muted">{t("common.loading")}</p>;
  if (user === null) return <LoginPage config={config} onSignedIn={setUser} />;

  const isAnalyst = user.role === "analyst";
  return (
    <SessionContext.Provider value={{ config, user, isAnalyst }}>
      <div className="shell">
        <header className="topbar">
          <strong className="brand">{config.app_name}</strong>
          <nav>
            <NavLink to="/projects">{t("nav.projects")}</NavLink>
            {isAnalyst && <NavLink to="/users">{t("nav.users")}</NavLink>}
          </nav>
          <span className="spacer" />
          <span className="muted who">
            {user.email} · {t(`role.${user.role}`)}
          </span>
          <LanguageToggle />
          <button className="link" onClick={signOut}>
            {t("nav.signOut")}
          </button>
        </header>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
          <Route path="/sites/:siteId" element={<SitePage />} />
          {isAnalyst && <Route path="/users" element={<UsersPage />} />}
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </div>
    </SessionContext.Provider>
  );
}
