FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# libexpat is needed by the GDAL bundled in the rasterio wheel.
RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock

COPY alembic.ini entrypoint.sh ./
COPY alembic ./alembic
COPY app ./app

RUN useradd --system --uid 10001 appuser && mkdir -p /data && chown appuser /data
USER appuser

EXPOSE 8000
CMD ["sh", "/app/entrypoint.sh"]
