import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errorMessage } from "../api";
import { useSession } from "../session";
import type { SurfaceKind, VerticalDatum } from "../types";

const DATUMS: VerticalDatum[] = ["ellipsoidal_wgs84", "egm2008", "egm96", "local"];

interface Props {
  siteId: string;
  /** The site's established height reference, once a baseline exists. */
  siteDatum: VerticalDatum | null;
  hasDesign: boolean;
  onUploaded: () => void;
}

export default function SurfaceUpload({ siteId, siteDatum, hasDesign, onUploaded }: Props) {
  const { t } = useTranslation();
  const { config } = useSession();
  const [kind, setKind] = useState<SurfaceKind>("survey");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [datum, setDatum] = useState<VerticalDatum | "">(siteDatum ?? "");
  const [accuracy, setAccuracy] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Once the site has a baseline, its height reference is the only valid choice.
  useEffect(() => {
    if (siteDatum) setDatum(siteDatum);
  }, [siteDatum]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const form = event.currentTarget;
    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);
    body.append("name", name);
    body.append("vertical_datum", datum);
    if (kind === "survey") {
      body.append("survey_date", date);
      body.append("stated_accuracy_m", accuracy);
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/sites/${siteId}/surfaces`, body);
      form.reset();
      setFile(null);
      setName("");
      setDate("");
      onUploaded();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label>
        {t("upload.kind")}
        <select value={kind} onChange={(e) => setKind(e.target.value as SurfaceKind)}>
          <option value="survey">{t("upload.kindSurvey")}</option>
          {!hasDesign && <option value="design">{t("upload.kindDesign")}</option>}
        </select>
      </label>
      <label>
        {t("upload.file")}
        <input type="file" required accept=".tif,.tiff" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <small className="muted">{t("upload.limit", { mb: config.max_dem_upload_mb })}</small>
      </label>
      <label>
        {t("common.name")}
        <input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {kind === "survey" && (
        <label>
          {t("upload.date")}
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      )}
      <label>
        {t("upload.datum")}
        <select required value={datum} onChange={(e) => setDatum(e.target.value as VerticalDatum)}>
          <option value="" disabled />
          {DATUMS.map((d) => (
            <option key={d} value={d} disabled={siteDatum !== null && d !== siteDatum}>
              {t(`upload.datums.${d}`)}
            </option>
          ))}
        </select>
        <small className="muted">{t("upload.datumHelp")}</small>
      </label>
      {kind === "survey" && (
        <label>
          {t("upload.accuracy")}
          <input
            type="number"
            dir="ltr"
            required
            min="0.001"
            max="100"
            step="0.001"
            value={accuracy}
            onChange={(e) => setAccuracy(e.target.value)}
          />
          <small className="muted">{t("upload.accuracyHelp")}</small>
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy}>
        {busy ? t("upload.uploading") : t("upload.submit")}
      </button>
    </form>
  );
}
