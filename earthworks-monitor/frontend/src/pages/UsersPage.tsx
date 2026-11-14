import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errorMessage } from "../api";
import { useSession } from "../session";
import type { Role, User } from "../types";

export default function UsersPage() {
  const { t } = useTranslation();
  const session = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", full_name: "", role: "viewer" as Role, password: "" });

  const load = useCallback(() => {
    api.get<User[]>("/users").then(setUsers, (e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/users", form);
      setForm({ email: "", full_name: "", role: "viewer", password: "" });
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function setActive(user: User, is_active: boolean) {
    setError("");
    try {
      await api.patch(`/users/${user.id}`, { is_active });
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <main className="page">
      <h1>{t("users.title")}</h1>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>{t("login.email")}</th>
            <th>{t("users.fullName")}</th>
            <th>{t("users.role")}</th>
            <th>{t("users.active")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td dir="ltr">{user.email}</td>
              <td>{user.full_name}</td>
              <td>{t(`role.${user.role}`)}</td>
              <td>{t(user.is_active ? "common.yes" : "common.no")}</td>
              <td>
                {user.id !== session.user.id && (
                  <button className="link" onClick={() => setActive(user, !user.is_active)}>
                    {t(user.is_active ? "users.deactivate" : "users.activate")}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t("users.new")}</h2>
      <form className="card inline-form" onSubmit={create}>
        <label>
          {t("login.email")}
          <input
            type="email"
            dir="ltr"
            required
            autoComplete="off"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          {t("users.fullName")}
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label>
          {t("users.role")}
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="viewer">{t("role.viewer")}</option>
            <option value="analyst">{t("role.analyst")}</option>
          </select>
        </label>
        <label>
          {t("login.password")}
          <input
            type="password"
            dir="ltr"
            required
            minLength={10}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <small className="muted">{t("users.passwordHelp")}</small>
        </label>
        <button className="primary">{t("common.create")}</button>
      </form>
    </main>
  );
}
