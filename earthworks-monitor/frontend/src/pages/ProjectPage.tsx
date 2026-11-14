import type { Polygon } from "geojson";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { api, errorMessage } from "../api";
import MapView, { BBox } from "../components/MapView";
import { formatArea } from "../format";
import { ZONE_COLORS } from "../mapColors";
import { useSession } from "../session";
import type { Outline, ParsedFile, Project, Site, User, Zone, ZoneType } from "../types";

/** null = no form open; site = undefined means "new site", otherwise "new zone in site". */
type FormTarget = { site?: Site } | null;
interface PendingOutline {
  name: string | null;
  geometry: Outline;
}

function unionBBox(sites: Site[]): BBox | null {
  if (sites.length === 0) return null;
  return sites.reduce<BBox>(
    (b, s) => [
      Math.min(b[0], s.bbox[0]),
      Math.min(b[1], s.bbox[1]),
      Math.max(b[2], s.bbox[2]),
      Math.max(b[3], s.bbox[3]),
    ],
    [180, 90, -180, -90],
  );
}

export default function ProjectPage() {
  const { t, i18n } = useTranslation();
  const { projectId } = useParams();
  const { config, isAnalyst } = useSession();

  const [project, setProject] = useState<Project | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [focus, setFocus] = useState<BBox | null>(null);
  const [error, setError] = useState("");

  const [target, setTarget] = useState<FormTarget>(null);
  const [name, setName] = useState("");
  const [zoneType, setZoneType] = useState<ZoneType>("mixed");
  const [drawing, setDrawing] = useState(false);
  const [pending, setPending] = useState<PendingOutline[]>([]);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSites = useCallback(
    () => api.get<Site[]>(`/projects/${projectId}/sites`).then(setSites),
    [projectId],
  );

  useEffect(() => {
    setError("");
    Promise.all([
      api.get<Project>(`/projects/${projectId}`),
      api.get<Site[]>(`/projects/${projectId}/sites`),
    ]).then(
      ([p, s]) => {
        setProject(p);
        setSites(s);
        setFocus(unionBBox(s));
      },
      (e) => setError(errorMessage(e)),
    );
  }, [projectId]);

  const preview = useMemo(() => pending.map((p) => p.geometry), [pending]);

  function openForm(next: FormTarget) {
    setTarget(next);
    setName("");
    setZoneType("mixed");
    setPending([]);
    setFormError("");
    setDrawing(false);
    if (next?.site) setFocus([...next.site.bbox]);
  }

  function onDrawn(polygon: Polygon) {
    setPending([{ name: null, geometry: polygon }]);
    setDrawing(false);
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFormError("");
    setDrawing(false);
    const body = new FormData();
    body.append("file", file);
    try {
      const parsed = await api.post<ParsedFile>("/geometry/parse", body);
      // A site is one outline (all polygons dissolved); zones stay one per polygon.
      setPending(target?.site ? parsed.features : [parsed.union]);
    } catch (e) {
      setPending([]);
      setFormError(errorMessage(e));
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending.length === 0) {
      setFormError(t("geometry.needOutline"));
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      if (target?.site) {
        for (const [index, outline] of pending.entries()) {
          const zoneName =
            pending.length === 1 ? name : (outline.name ?? `${name} ${index + 1}`);
          await api.post(`/sites/${target.site.id}/zones`, {
            name: zoneName,
            zone_type: zoneType,
            geometry: outline.geometry,
          });
        }
        await loadSites();
      } else {
        const site = await api.post<Site>(`/projects/${projectId}/sites`, {
          name,
          geometry: pending[0].geometry,
        });
        await loadSites();
        setFocus([...site.bbox]);
      }
      openForm(null);
    } catch (e) {
      // Zones created before a failure are kept; reload so the list matches the server.
      await loadSites().catch(() => undefined);
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeSite(site: Site) {
    if (!window.confirm(t("project.confirmDeleteSite", { name: site.name }))) return;
    await api.delete(`/sites/${site.id}`).catch((e) => setError(errorMessage(e)));
    await loadSites();
  }

  async function removeZone(zone: Zone) {
    if (!window.confirm(t("project.confirmDeleteZone", { name: zone.name }))) return;
    await api.delete(`/zones/${zone.id}`).catch((e) => setError(errorMessage(e)));
    await loadSites();
  }

  if (error && !project) {
    return (
      <main className="page">
        <p className="error">{error}</p>
        <Link to="/projects">{t("common.back")}</Link>
      </main>
    );
  }
  if (!project) return <p className="center muted">{t("common.loading")}</p>;

  return (
    <main className="workspace">
      <aside className="panel">
        <Link to="/projects" className="muted">
          {i18n.dir() === "rtl" ? "›" : "‹"} {t("nav.projects")}
        </Link>
        <h1>{project.name}</h1>
        {project.client_name && (
          <p className="muted">
            {t("projects.client")}: {project.client_name}
          </p>
        )}
        {error && <p className="error">{error}</p>}

        {target ? (
          <form className="card" onSubmit={save}>
            <h2>
              {target.site ? t("geometry.newZone", { site: target.site.name }) : t("geometry.newSite")}
            </h2>
            <label>
              {t("common.name")}
              <input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            {target.site && (
              <label>
                {t("zoneType.label")}
                <select value={zoneType} onChange={(e) => setZoneType(e.target.value as ZoneType)}>
                  {(["mixed", "cut", "fill"] as const).map((type) => (
                    <option key={type} value={type}>
                      {t(`zoneType.${type}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <fieldset>
              <legend>{t("geometry.outline")}</legend>
              <div className="row">
                <button
                  type="button"
                  className={drawing ? "active" : ""}
                  onClick={() => {
                    setPending([]);
                    setDrawing(true);
                  }}
                >
                  {t(pending.length && !drawing ? "geometry.redraw" : "geometry.draw")}
                </button>
                <label className="button">
                  {t("geometry.upload")}
                  <input type="file" hidden accept=".geojson,.json,.kml,.kmz,.zip" onChange={onFile} />
                </label>
              </div>
              <small className="muted">{t("geometry.uploadHelp", { mb: config.max_upload_mb })}</small>
              {pending.length === 1 && <p className="ok">✓ {t("geometry.ready")}</p>}
              {pending.length > 1 && (
                <p className="ok">✓ {t("geometry.multiZones", { count: pending.length })}</p>
              )}
            </fieldset>
            {formError && <p className="error">{formError}</p>}
            <div className="row">
              <button className="primary" disabled={busy}>
                {t("common.save")}
              </button>
              <button type="button" onClick={() => openForm(null)}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="row">
              <h2>{t("project.sites")}</h2>
              <span className="spacer" />
              {isAnalyst && <button onClick={() => openForm({})}>{t("project.addSite")}</button>}
            </div>
            {sites.length === 0 && <p className="muted">{t("project.noSites")}</p>}
            {sites.map((site) => (
              <section key={site.id} className="card site">
                <div className="row">
                  <h3>{site.name}</h3>
                  <span className="spacer" />
                  <button className="link" onClick={() => setFocus([...site.bbox])}>
                    {t("project.zoom")}
                  </button>
                </div>
                <p className="muted">
                  {t("project.area")}: {formatArea(site.area_m2)}
                </p>
                <p>
                  <Link to={`/sites/${site.id}`} className="button primary-link">
                    {t("project.dashboard")}
                  </Link>
                </p>
                {site.zones.length === 0 ? (
                  <p className="muted">{t("project.noZones")}</p>
                ) : (
                  <ul className="zones">
                    {site.zones.map((zone) => (
                      <li key={zone.id}>
                        <i style={{ background: ZONE_COLORS[zone.zone_type] }} />
                        <span>
                          {zone.name}
                          <small className="muted">
                            {t(`zoneType.${zone.zone_type}`)} · {formatArea(zone.area_m2)}
                          </small>
                        </span>
                        {isAnalyst && (
                          <button className="link danger" onClick={() => removeZone(zone)}>
                            {t("common.delete")}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {isAnalyst && (
                  <div className="row">
                    <button onClick={() => openForm({ site })}>{t("project.addZone")}</button>
                    <span className="spacer" />
                    <button className="link danger" onClick={() => removeSite(site)}>
                      {t("common.delete")}
                    </button>
                  </div>
                )}
              </section>
            ))}
            {isAnalyst && <AccessPanel projectId={project.id} />}
          </>
        )}
      </aside>
      <MapView
        config={config}
        sites={sites}
        preview={preview}
        focus={focus}
        drawing={drawing}
        onDrawn={onDrawn}
      />
    </main>
  );
}

function AccessPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const [viewers, setViewers] = useState<User[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<User[]>("/users"),
      api.get<User[]>(`/projects/${projectId}/members`),
    ]).then(
      ([users, members]) => {
        setViewers(users.filter((u) => u.role === "viewer" && u.is_active));
        setMemberIds(new Set(members.map((m) => m.id)));
      },
      (e) => setError(errorMessage(e)),
    );
  }, [projectId]);

  async function toggle(userId: string, checked: boolean) {
    const next = new Set(memberIds);
    if (checked) next.add(userId);
    else next.delete(userId);
    setError("");
    try {
      await api.put(`/projects/${projectId}/members`, { user_ids: [...next] });
      setMemberIds(next);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <details className="card">
      <summary>{t("project.access")}</summary>
      <p className="muted">{t("project.accessHelp")}</p>
      {error && <p className="error">{error}</p>}
      {viewers.length === 0 && <p className="muted">{t("project.noViewers")}</p>}
      {viewers.map((viewer) => (
        <label key={viewer.id} className="check">
          <input
            type="checkbox"
            checked={memberIds.has(viewer.id)}
            onChange={(e) => toggle(viewer.id, e.target.checked)}
          />
          <span dir="ltr">{viewer.email}</span>
        </label>
      ))}
    </details>
  );
}
