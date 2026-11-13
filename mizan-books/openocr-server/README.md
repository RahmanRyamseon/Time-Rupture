# OpenOCR server for Mizan Books

A tiny HTTP wrapper around [OpenOCR](https://github.com/Topdu/OpenOCR) (Apache-2.0).
Netlify can't run OpenOCR's Python/ONNX models, so this runs on any container host and the
Netlify site reaches it through the `/api/openocr` function.

**Languages:** OpenOCR's released models read **English and Chinese**. They do not read Arabic –
the web app's *Auto* mode therefore falls back to its on-device English + Arabic reader whenever
OpenOCR's confidence is below 0.92 (which is what happens on Arabic documents).

## API
- `GET /health` → `{"ok": true}`
- `POST /ocr` with a JPEG/PNG body → `{"lines": [{"text", "score", "box": [x1,y1,x2,y2]}], "ms"}`
- Optional auth: set `OCR_TOKEN`; callers send `Authorization: Bearer <token>`.

## Run locally
```bash
pip install -r requirements.txt
uvicorn app:app --port 7860      # first run downloads the two ONNX models (~37 MB)
curl --data-binary @invoice.png localhost:7860/ocr
```

## Deploy (pick one)
The Dockerfile needs no system packages, bakes the models in (the container runs with no network
access), and gives a ~1.2 GB image that runs on CPU (≈0.3 s per page). Tested with Docker 29:

```bash
docker build -t mizan-ocr .
docker run -d -p 7860:7860 -e OCR_TOKEN=change-me mizan-ocr
curl -H "Authorization: Bearer change-me" --data-binary @invoice.png localhost:7860/ocr
```

- **Hugging Face Spaces (free CPU):** create a Space → SDK *Docker* → upload `Dockerfile`, `app.py`,
  `requirements.txt`. Add a secret `OCR_TOKEN`. URL looks like `https://<user>-<space>.hf.space`.
- **Render / Railway / Fly.io:** new web service from this folder's Dockerfile; set `OCR_TOKEN`;
  Render/Railway pass `PORT` automatically.
- **Any VPS:** `docker build -t mizan-ocr . && docker run -d -p 7860:7860 -e OCR_TOKEN=... mizan-ocr`

## Connect it to the Netlify site
In Netlify → Site configuration → Environment variables (scope: Functions):

| Variable | Value |
|---|---|
| `OPENOCR_URL` | the server's base URL, e.g. `https://you-mizan-ocr.hf.space` |
| `OPENOCR_TOKEN` | the same value as the server's `OCR_TOKEN` |

Redeploy. *Company & settings* will show "OpenOCR server connected"; the engine can be set to
Auto (default), on-device only, or OpenOCR only.

Note: with OpenOCR enabled, page images are sent to your OCR server. Choose "On-device only" in
settings to keep documents on the user's device.
