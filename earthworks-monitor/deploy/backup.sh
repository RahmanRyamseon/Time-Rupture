#!/usr/bin/env bash
# Back up the database and the survey files to /var/backups/earthworks, keeping 7 days.
# Restore steps are in README.md ("Deploying to a server").
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="${BACKUP_DIR:-/var/backups/earthworks}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
COMPOSE=(docker compose -f docker-compose.yml -f deploy/compose.https.yml)
mkdir -p "$DEST"

env_get() { grep -m1 "^$1=" .env | cut -d= -f2-; }
"${COMPOSE[@]}" exec -T db pg_dump -U "$(env_get POSTGRES_USER)" -d "$(env_get POSTGRES_DB)" -Fc > "$DEST/db-$STAMP.dump"
# Surveys, results and reports live in the appdata volume, mounted at /data.
"${COMPOSE[@]}" run --rm --no-deps -T --user 0 -v "$DEST:/backup" --entrypoint tar api \
  -czf "/backup/data-$STAMP.tar.gz" -C /data .

find "$DEST" -name 'db-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$DEST" -name 'data-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "$STAMP backup written to $DEST"
