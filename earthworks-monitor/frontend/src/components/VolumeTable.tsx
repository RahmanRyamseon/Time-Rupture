import { useTranslation } from "react-i18next";
import { formatNumber, formatPercent, formatVolume } from "../format";
import type { AnalysisResults, Volume, ZoneProgress } from "../types";

interface Props {
  results: AnalysisResults;
  /** Progress per zone id; only meaningful for "change since baseline". */
  progress?: Map<string, ZoneProgress>;
}

export default function VolumeTable({ results, progress }: Props) {
  const { t } = useTranslation();
  const rows: { key: string; name: string; volume: Volume; total?: boolean }[] = [
    ...results.zones.map((z) => ({ key: z.zone_id, name: z.name, volume: z })),
    { key: "site", name: t("volumes.siteTotal"), volume: results.site, total: true },
  ];
  const u = results.uncertainty;
  const incomplete = rows.filter((r) => r.volume.data_coverage < 0.99);

  return (
    <>
      <div className="table-scroll">
        <table className="volumes">
          <thead>
            <tr>
              <th>{t("volumes.zone")}</th>
              <th>{t("volumes.cut")}</th>
              <th>{t("volumes.fill")}</th>
              <th title={t("volumes.net_help")}>{t("volumes.net")}</th>
              {progress && <th>{t("volumes.progress")}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, name, volume, total }) => {
              const p = progress?.get(key);
              return (
                <tr key={key} className={total ? "total" : ""}>
                  <th scope="row">{name}</th>
                  <td dir="ltr">{formatVolume(volume.cut_m3, volume.cut_pm_m3)}</td>
                  <td dir="ltr">{formatVolume(volume.fill_m3, volume.fill_pm_m3)}</td>
                  <td dir="ltr">{formatVolume(volume.net_m3, volume.net_pm_m3)}</td>
                  {progress && (
                    <td dir="ltr">
                      {p && p.progress !== null ? formatPercent(p.progress, p.progress_pm) : "–"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {incomplete.map((r) => (
        <p key={r.key} className="warn">
          {t("volumes.coverageWarning", {
            name: r.name,
            percent: formatNumber(r.volume.data_coverage * 100),
          })}
        </p>
      ))}
      <small className="muted notes">
        {t("volumes.confidence", { percent: u.confidence_z === 1.96 ? 95 : formatNumber(confidencePercent(u.confidence_z), 1) })}{" "}
        {t("volumes.lod", { lod: formatNumber(results.lod_m, 2) })}{" "}
        {t("volumes.sigma", {
          pixel: formatNumber(u.sigma_pixel_m, 3),
          systematic: formatNumber(u.sigma_systematic_m, 3),
          source: t(`volumes.source.${u.source}`),
        })}
      </small>
    </>
  );
}

/** Two-sided confidence level of +/- z sigma for a normal distribution. */
function confidencePercent(z: number): number {
  // Abramowitz-Stegun approximation of erf(z / sqrt(2)).
  const x = z / Math.SQRT2;
  const k = 1 / (1 + 0.3275911 * x);
  const poly = k * (0.254829592 + k * (-0.284496736 + k * (1.421413741 + k * (-1.453152027 + k * 1.061405429))));
  return (1 - poly * Math.exp(-x * x)) * 100;
}
