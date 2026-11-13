// Proxies OCR requests from the web app to a self-hosted OpenOCR server
// (see openocr-server/). Netlify Functions can't run OpenOCR's Python models
// themselves, so the server runs elsewhere (Hugging Face Space, Render, a VPS…).
// Configure with OPENOCR_URL (e.g. https://you-mizan-ocr.hf.space) and optional OPENOCR_TOKEN.
import type { Config } from "@netlify/functions";

const MAX_BYTES = 4_400_000;

export default async (req: Request) => {
  const base = Netlify.env.get("OPENOCR_URL")?.replace(/\/+$/, "");
  if (req.method === "GET") return Response.json({ enabled: Boolean(base) });
  if (!base) return Response.json({ error: "OpenOCR server is not configured on this site." }, { status: 503 });

  const type = req.headers.get("content-type") ?? "";
  if (!/^image\/(jpeg|png)$/.test(type)) return Response.json({ error: "Send a JPEG or PNG image" }, { status: 415 });
  const body = await req.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_BYTES) return Response.json({ error: "Image missing or too large" }, { status: 413 });

  const token = Netlify.env.get("OPENOCR_TOKEN");
  try {
    const res = await fetch(`${base}/ocr`, {
      method: "POST",
      headers: { "content-type": type, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body,
      signal: AbortSignal.timeout(50_000),
    });
    if (!res.ok) return Response.json({ error: `OpenOCR server returned ${res.status}` }, { status: 502 });
    return Response.json(await res.json());
  } catch (err) {
    console.error("OpenOCR proxy failed", err);
    return Response.json({ error: "OpenOCR server unreachable" }, { status: 502 });
  }
};

export const config: Config = { path: "/api/openocr", method: ["GET", "POST"] };
