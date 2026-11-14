import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errorMessage } from "../api";
import { LanguageToggle } from "../App";
import type { AppConfig, User } from "../types";

interface Props {
  config: AppConfig;
  onSignedIn: (user: User) => void;
}

export default function LoginPage({ config, onSignedIn }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.post<{ user: User }>("/auth/login", { email, password });
      onSignedIn(result.user);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <h1>{config.app_name}</h1>
        <p className="muted">{t("login.tagline")}</p>
        <label>
          {t("login.email")}
          <input
            type="email"
            dir="ltr"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          {t("login.password")}
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {t("login.submit")}
        </button>
        <LanguageToggle />
      </form>
    </main>
  );
}
