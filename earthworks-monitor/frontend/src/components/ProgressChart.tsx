import { useTranslation } from "react-i18next";
import { formatDate, formatPercent } from "../format";
import { SERIES_COLORS } from "../mapColors";
import type { ProgressEpoch } from "../types";

interface Props {
  epochs: ProgressEpoch[];
  selectedId: string | null;
  onSelect: (surfaceId: string) => void;
}

const W = 440;
const H = 230;
const M = { left: 40, right: 12, top: 10, bottom: 26 };

/** Progress per zone over time, with +/- bars. Drawn left-to-right in both languages,
 *  as time axes are in Gulf engineering documents; names are in the HTML legend. */
export default function ProgressChart({ epochs, selectedId, onSelect }: Props) {
  const { t } = useTranslation();
  const points = epochs.filter((e) => e.zones.length > 0);
  if (points.length < 2) return null;

  const days = points.map((e) => Date.parse(e.survey_date));
  const d0 = Math.min(...days);
  const span = Math.max(Math.max(...days) - d0, 1);
  const top = Math.max(
    100,
    ...points.flatMap((e) => e.zones.map((z) => ((z.progress ?? 0) + (z.progress_pm ?? 0)) * 100)),
  );
  const step = top <= 140 ? 20 : 50;
  const yMax = step * Math.ceil(top / step);
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const x = (day: number) => M.left + (plotW * (day - d0)) / span;
  const y = (percent: number) => M.top + plotH * (1 - percent / yMax);

  const zoneIds = [...new Set(points.flatMap((e) => e.zones.map((z) => z.zone_id)))];
  const zoneName = (id: string) => points.flatMap((e) => e.zones).find((z) => z.zone_id === id)?.name ?? "";
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

  return (
    <figure className="chart">
      <figcaption>{t("chart.title")}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("chart.title")}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 100 ? "#7a8794" : "#d9dee5"}
              strokeDasharray={tick === 100 ? "4 3" : undefined}
            />
            <text x={M.left - 6} y={y(tick) + 4} textAnchor="end" className="axis">
              {tick}%
            </text>
          </g>
        ))}
        {points.map((e, i) => (
          <g key={e.surface_id} className="epoch" onClick={() => onSelect(e.surface_id)}>
            <title>{`${e.name} · ${formatDate(e.survey_date)}`}</title>
            {e.surface_id === selectedId && (
              <line x1={x(days[i])} x2={x(days[i])} y1={M.top} y2={M.top + plotH} stroke="#e08a00" strokeWidth={1.5} />
            )}
            <rect x={x(days[i]) - 12} y={M.top} width={24} height={plotH + 20} fill="transparent" />
            <text x={x(days[i])} y={H - 8} textAnchor="middle" className={`axis ${e.surface_id === selectedId ? "current" : ""}`}>
              {e.survey_date.slice(0, 7)}
            </text>
          </g>
        ))}
        {zoneIds.map((zoneId, index) => {
          const color = SERIES_COLORS[index % SERIES_COLORS.length];
          const series = points.flatMap((e, i) => {
            const z = e.zones.find((zone) => zone.zone_id === zoneId);
            return z && z.progress !== null ? [{ px: x(days[i]), p: z.progress * 100, pm: (z.progress_pm ?? 0) * 100, e, z }] : [];
          });
          return (
            <g key={zoneId} pointerEvents="none">
              <path d={series.map((s, i) => `${i ? "L" : "M"}${s.px},${y(s.p)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} />
              {series.map((s) => (
                <g key={s.e.surface_id}>
                  {s.pm > 0 && (
                    <path
                      d={`M${s.px},${y(Math.max(s.p - s.pm, 0))}V${y(Math.min(s.p + s.pm, yMax))}M${s.px - 4},${y(Math.max(s.p - s.pm, 0))}h8M${s.px - 4},${y(Math.min(s.p + s.pm, yMax))}h8`}
                      stroke={color}
                      strokeWidth={1.2}
                    />
                  )}
                  <circle cx={s.px} cy={y(s.p)} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="chart-legend">
        {zoneIds.map((zoneId, index) => {
          const current = points.find((e) => e.surface_id === selectedId)?.zones.find((z) => z.zone_id === zoneId);
          return (
            <li key={zoneId}>
              <i style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }} />
              <span>{zoneName(zoneId)}</span>
              {current && current.progress !== null && (
                <bdi dir="ltr" className="muted">
                  {formatPercent(current.progress, current.progress_pm)}
                </bdi>
              )}
            </li>
          );
        })}
      </ul>
      <small className="muted">{t("chart.help")}</small>
    </figure>
  );
}
