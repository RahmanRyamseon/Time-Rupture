import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { api, errorMessage } from "../api";
import MapView, { BBox, RasterLayer } from "../components/MapView";
import SurfaceUpload from "../components/SurfaceUpload";
import VolumeTable from "../components/VolumeTable";
import { formatDate, formatNumber } from "../format";
import { useSession } from "../session";
import type { Analysis, Job, Progress, Site, Surface, ZoneProgress } from "../types";

type Mode = "baseline" | "previous" | "remaining" | "planned" | "custom";
const MODES: Mode[] = ["baseline", "previous", "remaining", "planned", "custom"];
const POLL_MS = 3000;

/** Deepest zoom at which a raster still has more detail than the screen. */
function maxZoomFor(resolutionM: number, latitude: number): number {
  const z = Math.log2((156543.03 * Math.cos((latitude * Math.PI) / 180)) / resolutionM);
  return Math.max(8, Math.min(22, Math.ceil(z)));
}

export default function SitePage() {
  const { t, i18n } = useTranslation();
  const { siteId } = useParams();
  const { config, isAnalyst } = useSession();

  const [site, setSite] = useState<Site | null>(null);
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [focus, setFocus] = useState<BBox | null>(null);

  const [epochId, setEpochId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("baseline");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showHillshade, setShowHillshade] = useState(true);
  const [showCutFill, setShowCutFill] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [s, a, p, j] = await Promise.all([
      api.get<Surface[]>(`/sites/${siteId}/surfaces`),
      api.get<Analysis[]>(`/sites/${siteId}/analyses`),
      api.get<Progress>(`/sites/${siteId}/progress`),
      isAnalyst ? api.get<Job[]>(`/sites/${siteId}/jobs`) : Promise.resolve([]),
    ]);
    setSurfaces(s);
    setAnalyses(a);
    setProgress(p);
    setJobs(j);
  }, [siteId, isAnalyst]);

  useEffect(() => {
    setError("");
    api.get<Site>(`/sites/${siteId}`).then(
      (s) => {
        setSite(s);
        setFocus([...s.bbox]);
      },
      (e) => setError(errorMessage(e)),
    );
    reload().catch((e) => setError(errorMessage(e)));
  }, [siteId, reload]);

  // Poll while the worker is busy with anything on this site.
  const working =
    surfaces.some((s) => s.status === "processing") || analyses.some((a) => a.status === "processing");
  useEffect(() => {
    if (!working) return;
    const timer = window.setInterval(() => reload().catch(() => undefined), POLL_MS);
    return () => window.clearInterval(timer);
  }, [working, reload]);

  const surveys = useMemo(
    () =>
      surfaces
        .filter((s) => s.kind === "survey" && s.status === "ready")
        .sort((a, b) => (a.survey_date ?? "").localeCompare(b.survey_date ?? "")),
    [surfaces],
  );
  const design = surfaces.find((s) => s.kind === "design" && s.status === "ready") ?? null;
  const reference = surveys.find((s) => s.is_reference) ?? null;
  const epochIndex = Math.max(
    0,
    epochId ? surveys.findIndex((s) => s.id === epochId) : surveys.length - 1,
  );
  const epoch = surveys[epochIndex] ?? null;

  // Which two surfaces the current mode compares (to minus from), or why it cannot.
  const [fromSurface, toSurface, unavailable] = useMemo((): [Surface | null, Surface | null, string] => {
    const byId = (id: string) => surfaces.find((s) => s.id === id && s.status === "ready") ?? null;
    if (mode === "custom") return [byId(customFrom), byId(customTo), ""];
    if (!epoch) return [null, null, ""];
    if (mode === "baseline") {
      return epoch.is_reference ? [null, null, t("site.isBaseline")] : [reference, epoch, ""];
    }
    if (mode === "previous") {
      return epochIndex === 0 ? [null, null, t("site.isFirst")] : [surveys[epochIndex - 1], epoch, ""];
    }
    if (!design) return [null, null, t("site.needDesign")];
    return mode === "remaining" ? [epoch, design, ""] : [reference, design, ""];
  }, [mode, epoch, epochIndex, surveys, surfaces, reference, design, customFrom, customTo, t]);

  const analysis =
    fromSurface && toSurface
      ? (analyses.find((a) => a.from_surface_id === fromSurface.id && a.to_surface_id === toSurface.id) ?? null)
      : null;

  const zoneProgress = useMemo(() => {
    if (mode !== "baseline" || !progress?.available || !epoch) return undefined;
    const entry = progress.epochs.find((e) => e.surface_id === epoch.id);
    return entry && new Map<string, ZoneProgress>(entry.zones.map((z) => [z.zone_id, z]));
  }, [mode, progress, epoch]);

  const rasters = useMemo(() => {
    const layers: RasterLayer[] = [];
    const latitude = site ? (site.bbox[1] + site.bbox[3]) / 2 : 0;
    const terrain = mode === "planned" ? design : (epoch ?? design);
    if (showHillshade && terrain?.bounds_wgs84 && terrain.resolution_m) {
      layers.push({
        key: `hillshade-${terrain.id}`,
        url: `${window.location.origin}/api/tiles/surfaces/${terrain.id}/hillshade/{z}/{x}/{y}.png`,
        bounds: terrain.bounds_wgs84,
        maxzoom: maxZoomFor(terrain.resolution_m, latitude),
        opacity: 1,
      });
    }
    if (showCutFill && analysis?.status === "ready" && analysis.results) {
      layers.push({
        key: `dod-${analysis.id}-${analysis.computed_at}`,
        url: `${window.location.origin}/api/tiles/analyses/${analysis.id}/dod/{z}/{x}/{y}.png?v=${encodeURIComponent(analysis.computed_at ?? "")}`,
        bounds: analysis.results.bounds_wgs84,
        maxzoom: maxZoomFor(analysis.results.resolution_m, latitude),
        opacity: 0.8,
      });
    }
    return layers;
  }, [site, mode, epoch, design, analysis, showHillshade, showCutFill]);

  const sites = useMemo(() => (site ? [site] : []), [site]);

  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const compute = () =>
    act(() =>
      api.post(`/sites/${siteId}/analyses`, {
        from_surface_id: fromSurface!.id,
        to_surface_id: toSurface!.id,
      }),
    );

  if (!site) {
    return error ? (
      <main className="page">
        <p className="error">{error}</p>
      </main>
    ) : (
      <p className="center muted">{t("common.loading")}</p>
    );
  }

  const range = analysis?.results?.display_range_m;
  const legend =
    showCutFill && range ? (
      <li className="ramp">
        <span>{t("legend.cutFill")}</span>
        <div className="ramp-bar" dir="ltr" />
        <div className="ramp-labels">
          {/* <bdi> keeps the sign on the left of the number inside Arabic text. */}
          <span>
            <bdi dir="ltr">−{formatNumber(range, 1)}</bdi> {t("legend.cutLabel")}
          </span>
          <span>
            {t("legend.fillLabel")} <bdi dir="ltr">+{formatNumber(range, 1)}</bdi>
          </span>
        </div>
      </li>
    ) : null;

  return (
    <main className="workspace">
      <aside className="panel wide">
        <Link to={`/projects/${site.project_id}`} className="muted">
          {i18n.dir() === "rtl" ? "›" : "‹"} {t("project.sites")}
        </Link>
        <h1>{site.name}</h1>
        {error && <p className="error">{error}</p>}

        {surveys.length === 0 ? (
          <p className="muted">{t(isAnalyst ? "site.noSurveysAnalyst" : "site.noSurveys")}</p>
        ) : (
          <section className="card">
            <label>
              {t("site.compare")}
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {t(`site.mode.${m}`)}
                  </option>
                ))}
              </select>
            </label>
            {mode === "custom" ? (
              <div className="pair">
                {(
                  [
                    ["from", customFrom, setCustomFrom],
                    ["to", customTo, setCustomTo],
                  ] as const
                ).map(([key, value, set]) => (
                  <label key={key}>
                    {t(`site.${key}`)}
                    <select value={value} onChange={(e) => set(e.target.value)}>
                      <option value="" />
                      {[...surveys, ...(design ? [design] : [])].map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              mode !== "planned" &&
              epoch && (
                <label>
                  {t("site.survey")}: <strong>{epoch.name}</strong>
                  {epoch.survey_date && <span className="muted"> · {formatDate(epoch.survey_date)}</span>}
                  {surveys.length > 1 && (
                    <input
                      type="range"
                      min={0}
                      max={surveys.length - 1}
                      step={1}
                      value={epochIndex}
                      onChange={(e) => setEpochId(surveys[Number(e.target.value)].id)}
                    />
                  )}
                </label>
              )
            )}

            {unavailable && <p className="muted">{unavailable}</p>}
            {fromSurface && toSurface && (
              <>
                <p className="muted pair-line">
                  {fromSurface.name} → {toSurface.name}
                </p>
                {!analysis && <p className="muted">{t("site.notComputed")}</p>}
                {analysis?.status === "processing" && <p className="muted">{t("site.computing")}</p>}
                {analysis?.status === "failed" && <p className="error">{analysis.error}</p>}
                {analysis?.stale && <p className="warn">{t("site.stale")}</p>}
                {analysis?.status === "ready" && analysis.results && (
                  <VolumeTable results={analysis.results} progress={zoneProgress} />
                )}
                {isAnalyst && analysis?.status !== "processing" && (!analysis || analysis.stale || analysis.status === "failed") && (
                  <button className="primary" disabled={busy} onClick={compute}>
                    {t(analysis ? "site.recompute" : "site.compute")}
                  </button>
                )}
              </>
            )}

            <fieldset>
              <legend>{t("site.layers")}</legend>
              <label className="check">
                <input type="checkbox" checked={showHillshade} onChange={(e) => setShowHillshade(e.target.checked)} />
                {t("site.hillshade")}
              </label>
              <label className="check">
                <input type="checkbox" checked={showCutFill} onChange={(e) => setShowCutFill(e.target.checked)} />
                {t("site.cutFill")}
              </label>
            </fieldset>
          </section>
        )}

        <h2>{t("site.surfaces")}</h2>
        {surfaces.map((surface) => (
          <SurfaceCard
            key={surface.id}
            surface={surface}
            job={jobs.find((j) => j.surface_id === surface.id)}
            busy={busy}
            act={act}
            siteId={site.id}
          />
        ))}
        {isAnalyst && (
          <details className="card" open={surfaces.length === 0}>
            <summary>{t("site.upload")}</summary>
            <SurfaceUpload
              siteId={site.id}
              siteDatum={surfaces.find((s) => s.is_reference)?.vertical_datum ?? null}
              hasDesign={surfaces.some((s) => s.kind === "design")}
              onUploaded={() => reload().catch((e) => setError(errorMessage(e)))}
            />
          </details>
        )}
      </aside>
      <MapView config={config} sites={sites} preview={[]} focus={focus} rasters={rasters} legendExtra={legend} />
    </main>
  );
}

interface CardProps {
  surface: Surface;
  job: Job | undefined;
  busy: boolean;
  siteId: string;
  act: (action: () => Promise<unknown>) => Promise<void>;
}

function SurfaceCard({ surface, job, busy, siteId, act }: CardProps) {
  const { t } = useTranslation();
  const { isAnalyst } = useSession();
  const alignment = surface.alignment;
  const coverage = surface.stats?.site_coverage;

  return (
    <section className="card surface">
      <div className="row">
        <h3>{surface.name}</h3>
        {surface.is_reference && <span className="badge">{t("site.baseline")}</span>}
        {surface.kind === "design" && <span className="badge">{t("site.design")}</span>}
        <span className="spacer" />
        {surface.status !== "ready" && (
          <span className={`badge ${surface.status}`}>{t(`site.status.${surface.status}`)}</span>
        )}
        {isAnalyst && surface.status === "ready" && (
          <span className={`badge ${surface.released ? "ok" : ""}`}>
            {t(surface.released ? "site.released" : "site.notReleased")}
          </span>
        )}
      </div>
      <small className="muted">
        {[
          surface.survey_date && formatDate(surface.survey_date),
          surface.resolution_m && t("site.resolution", { value: formatNumber(surface.resolution_m, 2) }),
          t(`upload.datums.${surface.vertical_datum}`),
        ]
          .filter(Boolean)
          .join(" · ")}
      </small>
      {alignment?.method === "vertical_shift_median_stable_ground" && (
        <small className="muted" dir="auto">
          {t("site.shift", { offset: formatNumber(-surface.vertical_offset_m, 2) })}
        </small>
      )}
      {alignment?.method === "none" && <small className="warn">{t("site.noAlignment")}</small>}
      {coverage !== undefined && coverage < 0.99 && (
        <small className="warn">{t("site.coverage", { percent: formatNumber(coverage * 100) })}</small>
      )}
      {surface.status === "failed" && <p className="error">{surface.error}</p>}
      {isAnalyst && (
        <div className="row actions">
          {surface.status === "failed" && job?.status === "failed" && (
            <button disabled={busy} onClick={() => act(() => api.post(`/jobs/${job.id}/retry`))}>
              {t("site.retry")}
            </button>
          )}
          {surface.status === "ready" && (
            <button
              className="link"
              disabled={busy}
              onClick={() => act(() => api.patch(`/surfaces/${surface.id}`, { released: !surface.released }))}
            >
              {t(surface.released ? "site.unrelease" : "site.release")}
            </button>
          )}
          {surface.status === "ready" && surface.kind === "survey" && !surface.is_reference && (
            <button
              className="link"
              disabled={busy}
              onClick={() => {
                if (window.confirm(t("site.confirmBaseline", { name: surface.name }))) {
                  act(() => api.post(`/sites/${siteId}/reference`, { surface_id: surface.id }));
                }
              }}
            >
              {t("site.setBaseline")}
            </button>
          )}
          <span className="spacer" />
          <button
            className="link danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm(t("site.confirmDelete", { name: surface.name }))) {
                act(() => api.delete(`/surfaces/${surface.id}`));
              }
            }}
          >
            {t("common.delete")}
          </button>
        </div>
      )}
    </section>
  );
}
