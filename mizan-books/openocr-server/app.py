"""Small HTTP wrapper around OpenOCR (https://github.com/Topdu/OpenOCR) for Mizan Books.

POST /ocr  (body: raw image bytes, JPEG/PNG)  ->  {"lines": [{"text", "score", "box"}], "ms": int}
GET  /health                                  ->  {"ok": true}

OpenOCR's ONNX models read English and Chinese well but not Arabic; the web app
falls back to its on-device Arabic reader when results here look weak.
Optional auth: set OCR_TOKEN and send "Authorization: Bearer <token>".
"""
import json
import os
import tempfile
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from openocr import OpenOCR

MAX_BYTES = 8 * 1024 * 1024
TOKEN = os.environ.get("OCR_TOKEN", "")

app = FastAPI(title="Mizan OpenOCR server")
engine = OpenOCR(task="ocr", mode=os.environ.get("OCR_MODE", "mobile"), backend="onnx")


def _parse(result) -> list[dict]:
    """OpenOCR returns (["<name>\\t<json list>"], timings); normalise to plain lines."""
    lines = []
    raw = result[0] if isinstance(result, (list, tuple)) else result
    for item in raw:
        payload = item.split("\t", 1)[1] if isinstance(item, str) and "\t" in item else item
        boxes = json.loads(payload) if isinstance(payload, str) else payload
        for b in boxes or []:
            pts = b.get("points") or []
            xs = [p[0] for p in pts] or [0]
            ys = [p[1] for p in pts] or [0]
            lines.append({
                "text": b.get("transcription", ""),
                "score": round(float(b.get("score", 0)), 4),
                "box": [min(xs), min(ys), max(xs), max(ys)],
            })
    return lines


@app.get("/health")
def health():
    return {"ok": True, "engine": "openocr", "mode": os.environ.get("OCR_MODE", "mobile")}


@app.post("/ocr")
async def ocr(request: Request):
    if TOKEN and request.headers.get("authorization") != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="unauthorized")
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")
    if len(body) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="image too large")
    suffix = ".png" if body[:4] == b"\x89PNG" else ".jpg"
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "page" + suffix)
        with open(path, "wb") as f:
            f.write(body)
        start = time.time()
        try:
            result = engine(image_path=path, save_dir=tmp)
        except TypeError:  # older/newer signatures without save_dir
            result = engine(image_path=path)
        ms = int((time.time() - start) * 1000)
    return JSONResponse({"lines": _parse(result), "ms": ms})
