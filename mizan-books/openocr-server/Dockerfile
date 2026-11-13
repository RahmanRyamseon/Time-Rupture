# syntax=docker/dockerfile:1
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
# opencv-python (pulled in by openocr) needs libGL; swap in the headless build so no
# system packages are required. The optional "extra_ca" secret is only for building
# behind a TLS-intercepting proxy; normal builds don't need it.
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export PIP_CERT=/run/secrets/extra_ca SSL_CERT_FILE=/run/secrets/extra_ca; fi && \
    pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y opencv-python && \
    pip install --no-cache-dir --force-reinstall --no-deps opencv-python-headless
# Bake the ONNX models into the image so the server starts without network access.
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export SSL_CERT_FILE=/run/secrets/extra_ca; fi && \
    python -c "import urllib.request, os; d='/root/.cache/openocr'; os.makedirs(d, exist_ok=True); base='https://github.com/Topdu/OpenOCR/releases/download/develop0.0.1/'; [urllib.request.urlretrieve(base + f, os.path.join(d, f)) for f in ('openocr_det_model.onnx', 'openocr_rec_model.onnx')]"
COPY app.py .
ENV PORT=7860
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:' + __import__('os').environ.get('PORT', '7860') + '/health')"
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
