import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../api";
import { useSession } from "../session";
import type { Project } from "../types";

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { isAnalyst } = useSession();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");

  const load = useCallback(() => {
    api.get<Project[]>("/projects").then(setProjects, (e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/projects", { name, client_name: client });
      setCreating(false);
      setName("");
      setClient("");
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function remove(project: Project) {
    if (!window.confirm(t("projects.confirmDelete", { name: project.name }))) return;
    try {
      await api.delete(`/projects/${project.id}`);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <main className="page">
      <div className="row">
        <h1>{t("projects.title")}</h1>
        <span className="spacer" />
        {isAnalyst && !creating && (
          <button className="primary" onClick={() => setCreating(true)}>
            {t("projects.new")}
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {creating && (
        <form className="card inline-form" onSubmit={create}>
          <label>
            {t("common.name")}
            <input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label>
            {t("projects.client")}
            <input maxLength={200} value={client} onChange={(e) => setClient(e.target.value)} />
          </label>
          <button className="primary">{t("common.create")}</button>
          <button type="button" onClick={() => setCreating(false)}>
            {t("common.cancel")}
          </button>
        </form>
      )}
      {projects === null && !error && <p className="muted">{t("common.loading")}</p>}
      {projects?.length === 0 && (
        <p className="muted">{t(isAnalyst ? "projects.empty" : "projects.emptyViewer")}</p>
      )}
      <ul className="cards">
        {projects?.map((project) => (
          <li key={project.id} className="card">
            <h2>
              <Link to={`/projects/${project.id}`}>{project.name}</Link>
            </h2>
            {project.client_name && (
              <p className="muted">
                {t("projects.client")}: {project.client_name}
              </p>
            )}
            {project.description && <p>{project.description}</p>}
            <div className="row">
              <span className="muted">{t("projects.sites", { count: project.site_count })}</span>
              <span className="spacer" />
              {isAnalyst && (
                <button className="link danger" onClick={() => remove(project)}>
                  {t("common.delete")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
