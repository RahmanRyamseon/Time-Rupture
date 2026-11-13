FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Bake the ONNX models into the image so the server starts without network access.
RUN mkdir -p /root/.cache/openocr && \
    curl -fsSL -o /root/.cache/openocr/openocr_det_model.onnx https://github.com/Topdu/OpenOCR/releases/download/develop0.0.1/openocr_det_model.onnx && \
    curl -fsSL -o /root/.cache/openocr/openocr_rec_model.onnx https://github.com/Topdu/OpenOCR/releases/download/develop0.0.1/openocr_rec_model.onnx
COPY app.py .
ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
