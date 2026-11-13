// On-device scanning: Tesseract OCR (English + Arabic), pdf.js text extraction and
// QR decoding (for Saudi ZATCA e-invoices). Nothing leaves the browser here.
import type { Worker } from "tesseract.js";
import type { PDFDocumentProxy } from "pdfjs-dist";

export type Progress = (msg: string, pct?: number) => void;

let workerPromise: Promise<Worker> | null = null;
let progressCb: Progress | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, OEM } = await import("tesseract.js");
      const base = `${location.origin}/ocr`;
      return createWorker(["eng", "ara"], OEM.LSTM_ONLY, {
        workerPath: `${base}/worker.min.js`,
        corePath: `${base}/core`,
        langPath: `${base}/lang`,
        gzip: true,
        logger: (m: { status: string; progress: number }) => progressCb?.(m.status, m.progress),
      });
    })();
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

/** Loads an image file into a canvas, upscaling small photos so OCR has enough pixels. */
export async function fileToCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file);
  const longest = Math.max(bmp.width, bmp.height);
  const scale = longest < 1600 ? 1600 / longest : longest > 3500 ? 3500 / longest : 1;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

/** Greyscale + contrast stretch, which helps Tesseract on phone photos of receipts. */
function preprocess(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    const v = ((d[i] - min) / range) * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export async function ocrCanvas(canvas: HTMLCanvasElement, onProgress?: Progress): Promise<string> {
  progressCb = onProgress ?? null;
  onProgress?.("loading OCR (English + Arabic)");
  const w = await getWorker();
  const { data } = await w.recognize(preprocess(canvas));
  progressCb = null;
  return data.text;
}

export async function scanQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const tries = [1, 0.5];
  for (const s of tries) {
    let c = canvas, cx = ctx;
    if (s !== 1) {
      c = document.createElement("canvas");
      c.width = Math.round(canvas.width * s); c.height = Math.round(canvas.height * s);
      cx = c.getContext("2d", { willReadFrequently: true })!;
      cx.drawImage(canvas, 0, 0, c.width, c.height);
    }
    const img = cx.getImageData(0, 0, c.width, c.height);
    const res = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
    if (res?.data) return res.data;
  }
  return null;
}

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function pdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const lib = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    })();
  }
  return pdfjsPromise;
}

export async function openPdf(file: Blob): Promise<PDFDocumentProxy> {
  const lib = await pdfjs();
  return lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

/** Text layer of a PDF, rebuilt line by line from item positions (works for RTL too). */
export async function pdfText(doc: PDFDocumentProxy): Promise<string> {
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string; rtl: boolean }[]>();
    for (const it of tc.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      const x = it.transform[4];
      const rtl = /[؀-ۿ]/.test(it.str);
      const row = rows.get(y) ?? [];
      row.push({ x, s: it.str, rtl });
      rows.set(y, row);
    }
    const ys = [...rows.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const items = rows.get(y)!.sort((a, b) => a.x - b.x);
      out.push(items.map((i) => i.s).join(" "));
    }
    page.cleanup();
  }
  return out.join("\n");
}

export async function renderPdfPage(doc: PDFDocumentProxy, pageNo: number, scale = 2.2): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale });
  const c = document.createElement("canvas");
  c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas: c }).promise;
  return c;
}

export interface ScanResult { text: string; qr: string | null; method: "pdf-text" | "ocr"; preview?: string }

/**
 * Reads any invoice/statement file: PDF text layer if present, otherwise OCR of
 * each page (or of the image). Also looks for a QR code on the first page.
 */
export async function scanFile(file: File, onProgress?: Progress, maxPages = 8): Promise<ScanResult> {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    onProgress?.("reading PDF");
    const doc = await openPdf(file);
    const text = await pdfText(doc);
    const first = await renderPdfPage(doc, 1, 2);
    const qr = await scanQr(first).catch(() => null);
    const preview = first.toDataURL("image/jpeg", 0.6);
    if (text.replace(/\s/g, "").length > 40) return { text, qr, method: "pdf-text", preview };
    const pages: string[] = [];
    const n = Math.min(doc.numPages, maxPages);
    for (let p = 1; p <= n; p++) {
      onProgress?.(`OCR page ${p}/${n}`);
      pages.push(await ocrCanvas(p === 1 ? await renderPdfPage(doc, 1) : await renderPdfPage(doc, p), onProgress));
    }
    return { text: pages.join("\n"), qr, method: "ocr", preview };
  }
  const canvas = await fileToCanvas(file);
  const qr = await scanQr(canvas).catch(() => null);
  const text = await ocrCanvas(canvas, onProgress);
  return { text, qr, method: "ocr", preview: canvas.toDataURL("image/jpeg", 0.6) };
}

/** Shrinks an image for upload to the AI endpoint (keeps it under the 4 MB limit). */
export async function imageForUpload(file: File): Promise<{ mediaType: string; data: string }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const url = c.toDataURL("image/jpeg", 0.85);
  return { mediaType: "image/jpeg", data: url.split(",")[1] };
}

/** Small preview image of the first page/photo, without running OCR. */
export async function previewFile(file: File): Promise<string | undefined> {
  try {
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      const doc = await openPdf(file);
      return (await renderPdfPage(doc, 1, 1.2)).toDataURL("image/jpeg", 0.6);
    }
    return (await fileToCanvas(file)).toDataURL("image/jpeg", 0.6);
  } catch {
    return undefined;
  }
}
