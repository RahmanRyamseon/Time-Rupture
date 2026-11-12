import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errorMessage } from "../api";
import { useSession } from "../session";
import type { SurfaceKind, VerticalDatum } from "../types";

type UploadKind = SurfaceKind | "stereo";
const STEREO_FILES = ["left_image", "right_image", "left_camera", "right_camera"] as const;
const STEREO_LABELS = { left_image: "leftImage", right_image: "rightImage", left_camera: "leftCamera", right_camera: "rightCamera" } as const;

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
  const [kind, setKind] = useState<UploadKind>("survey");
  const [camera, setCamera] = useState(config.camera_models[0] ?? "rpc");
  const [bundleAdjust, setBundleAdjust] = useState(false);
  const [stereoFiles, setStereoFiles] = useState<Record<string, File | null>>({});
  const singleFile = config.single_file_camera_models.includes(camera);
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
    const form = event.currentTarget;
    const body = new FormData();
    body.append("name", name);
    if (kind === "stereo") {
      body.append("camera_model", camera);
      body.append("survey_date", date);
      body.append("stated_accuracy_m", accuracy);
      body.append("bundle_adjust", String(bundleAdjust));
      const roles = singleFile ? ["scene"] : STEREO_FILES;
      for (const role of roles) {
        const chosen = stereoFiles[role];
        if (chosen) body.append(role, chosen);
      }
    } else {
      if (!file) return;
      body.append("file", file);
      body.append("kind", kind);
      body.append("vertical_datum", datum);
      if (kind === "survey") {
        body.append("survey_date", date);
        body.append("stated_accuracy_m", accuracy);
      }
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/sites/${siteId}/${kind === "stereo" ? "stereo-surveys" : "surfaces"}`, body);
      form.reset();
      setFile(null);
      setStereoFiles({});
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
        <select value={kind} onChange={(e) => setKind(e.target.value as UploadKind)}>
          <option value="survey">{t("upload.kindSurvey")}</option>
          <option value="stereo">{t("upload.kindStereo")}</option>
          {!hasDesign && <option value="design">{t("upload.kindDesign")}</option>}
        </select>
      </label>
      {kind === "stereo" ? (
        <>
          <label>
            {t("upload.cameraModel")}
            <select value={camera} onChange={(e) => setCamera(e.target.value)}>
              {config.camera_models.map((model) => (
                <option key={model} value={model}>
                  {t(`upload.cameras.${model}`, { defaultValue: model })}
                </option>
              ))}
            </select>
          </label>
          {(singleFile ? (["scene"] as const) : STEREO_FILES).map((role) => (
            <label key={role}>
              {t(role === "scene" ? "upload.scene" : `upload.${STEREO_LABELS[role]}`)}
              <input
                type="file"
                required={role === "scene" || role.endsWith("image")}
                onChange={(e) => setStereoFiles((f) => ({ ...f, [role]: e.target.files?.[0] ?? null }))}
              />
            </label>
          ))}
          {!singleFile && <small className="muted">{t("upload.cameraHelp")}</small>}
          <small className="muted">{t("upload.stereoLimit", { mb: config.max_stereo_upload_mb })}</small>
          <label className="check">
            <input type="checkbox" checked={bundleAdjust} onChange={(e) => setBundleAdjust(e.target.checked)} />
            {t("upload.bundleAdjust")}
          </label>
        </>
      ) : (
        <label>
          {t("upload.file")}
          <input type="file" required accept=".tif,.tiff" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <small className="muted">{t("upload.limit", { mb: config.max_dem_upload_mb })}</small>
        </label>
      )}
      <label>
        {t("common.name")}
        <input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {kind !== "design" && (
        <label>
          {t("upload.date")}
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      )}
      {kind !== "stereo" && (
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
      )}
      {kind !== "design" && (
        <label>
          {t(kind === "stereo" ? "upload.expectedAccuracy" : "upload.accuracy")}
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
          <small className="muted">{t(kind === "stereo" ? "upload.expectedAccuracyHelp" : "upload.accuracyHelp")}</small>
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy}>
        {busy ? t("upload.uploading") : t("upload.submit")}
      </button>
    </form>
  );
}
