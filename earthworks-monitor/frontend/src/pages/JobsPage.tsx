import { Fragment, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { api, errorMessage } from "../api";
import { formatNumber } from "../format";
import { numberLocale } from "../i18n";
import type { Analysis, Job, JobDetail, Surface } from "../types";

const POLL_MS = 3000;

function formatTime(iso: string | null): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat(numberLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export default function JobsPage() {
  const { t, i18n } = useTranslation();
  const { siteId } = useParams();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [open, setOpen] = useState<JobDetail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [jobList, surfaces, analyses] = await Promise.all([
      api.get<Job[]>(`/sites/${siteId}/jobs`),
      api.get<Surface[]>(`/sites/${siteId}/surfaces`),
      api.get<Analysis[]>(`/sites/${siteId}/analyses`),
    ]);
    const lookup = new Map(surfaces.map((s) => [s.id, s.name]));
    for (const a of analyses) {
      lookup.set(a.id, `${lookup.get(a.from_surface_id) ?? "?"} → ${lookup.get(a.to_surface_id) ?? "?"}`);
    }
    setJobs(jobList);
    setNames(lookup);
  }, [siteId]);

  const openId = open?.id;
  const refreshLog = useCallback(async () => {
    if (openId) setOpen(await api.get<JobDetail>(`/jobs/${openId}`));
  }, [openId]);

  useEffect(() => {
    load().catch((e) => setError(errorMessage(e)));
  }, [load]);

  const active = jobs?.some((j) => j.status === "queued" || j.status === "running") ?? false;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
      refreshLog().catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, load, refreshLog]);

  async function toggleLog(job: Job) {
    if (open?.id === job.id) return setOpen(null);
    try {
      setOpen(await api.get<JobDetail>(`/jobs/${job.id}`));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function retry(job: Job) {
    setError("");
    try {
      await api.post(`/jobs/${job.id}/retry`);
      await load();
      await refreshLog();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <main className="page wide-page">
      <Link to={`/sites/${siteId}`} className="muted">
        {i18n.dir() === "rtl" ? "›" : "‹"} {t("jobs.backToSite")}
      </Link>
      <h1>{t("jobs.title")}</h1>
      {error && <p className="error">{error}</p>}
      {jobs === null && !error && <p className="muted">{t("common.loading")}</p>}
      {jobs?.length === 0 && <p className="muted">{t("jobs.empty")}</p>}
      {jobs && jobs.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("jobs.job")}</th>
                <th>{t("jobs.target")}</th>
                <th>{t("jobs.statusLabel")}</th>
                <th>{t("jobs.attempts")}</th>
                <th>{t("jobs.started")}</th>
                <th>{t("jobs.duration")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const seconds =
                  job.started_at && job.finished_at
                    ? (Date.parse(job.finished_at) - Date.parse(job.started_at)) / 1000
                    : null;
                return (
                  <Fragment key={job.id}>
                    <tr>
                      <td>{t(`jobs.kind.${job.kind}`, { defaultValue: job.kind })}</td>
                      <td>{names.get(job.surface_id ?? job.analysis_id ?? "") ?? "–"}</td>
                      <td>
                        <span className={`badge ${job.status === "done" ? "ok" : job.status === "failed" ? "failed" : "processing"}`}>
                          {t(`jobs.status.${job.status}`)}
                        </span>
                      </td>
                      <td>{formatNumber(job.attempts)}</td>
                      <td>{formatTime(job.started_at)}</td>
                      <td>{seconds === null ? "–" : t("jobs.seconds", { value: formatNumber(seconds) })}</td>
                      <td className="actions-cell">
                        <button className="link" onClick={() => toggleLog(job)}>
                          {t(open?.id === job.id ? "jobs.hideLog" : "jobs.viewLog")}
                        </button>
                        {job.status === "failed" && (
                          <button className="link" onClick={() => retry(job)}>
                            {t("jobs.retry")}
                          </button>
                        )}
                      </td>
                    </tr>
                    {job.status === "failed" && job.error && open?.id !== job.id && (
                      <tr>
                        <td colSpan={7}>
                          <p className="error job-error">{job.error}</p>
                        </td>
                      </tr>
                    )}
                    {open?.id === job.id && (
                      <tr>
                        <td colSpan={7}>
                          {/* Tool output is English and left-to-right in both languages. */}
                          <pre className="log" dir="ltr">
                            {open.log || "…"}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
