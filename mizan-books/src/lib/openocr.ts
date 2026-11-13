// Client for the optional OpenOCR server (proxied by the /api/openocr Netlify Function).
export interface OcrLine { text: string; score: number; box: [number, number, number, number] }

let status: Promise<boolean> | null = null;

export function openocrAvailable(): Promise<boolean> {
  if (!status) {
    status = fetch("/api/openocr")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((j: { enabled?: boolean }) => Boolean(j.enabled))
      .catch(() => false);
  }
  return status;
}

/** Joins detected text boxes into reading-order lines (top-to-bottom, left-to-right). */
export function linesToText(lines: OcrLine[]): string {
  const sorted = [...lines].sort((a, b) => (a.box[1] + a.box[3]) / 2 - (b.box[1] + b.box[3]) / 2);
  const rows: OcrLine[][] = [];
  for (const l of sorted) {
    const mid = (l.box[1] + l.box[3]) / 2;
    const row = rows[rows.length - 1];
    if (row) {
      const r = row[0];
      const h = Math.max(4, r.box[3] - r.box[1]);
      if (Math.abs(mid - (r.box[1] + r.box[3]) / 2) < h * 0.5) { row.push(l); continue; }
    }
    rows.push([l]);
  }
  return rows.map((r) => r.sort((a, b) => a.box[0] - b.box[0]).map((l) => l.text).join(" ")).join("\n");
}

/** Length-weighted mean recognition score, used to decide whether to trust OpenOCR. */
export function meanScore(lines: OcrLine[]): number {
  let w = 0, s = 0;
  for (const l of lines) { const n = Math.max(1, l.text.length); w += n; s += l.score * n; }
  return w ? s / w : 0;
}

export async function openocrCanvas(canvas: HTMLCanvasElement): Promise<{ text: string; score: number }> {
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.9));
  const r = await fetch("/api/openocr", { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  const lines = (j.lines ?? []) as OcrLine[];
  return { text: linesToText(lines), score: meanScore(lines) };
}
