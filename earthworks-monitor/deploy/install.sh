#!/usr/bin/env bash
# Put Earthworks Monitor on a fresh Ubuntu 22.04/24.04 (or Debian 12) server, with HTTPS.
#
#   sudo bash deploy/install.sh                  # address <server-ip>.sslip.io, no domain needed
#   sudo bash deploy/install.sh monitor.example.com   # your own domain (DNS A record -> server)
#
# Run it from the root of the repository checkout. It is safe to run again: an existing
# .env (passwords included) is kept, and the stack is rebuilt and restarted.
set -euo pipefail

cd "$(dirname "$0")/.."
[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo bash deploy/install.sh)"; exit 1; }
[ -f docker-compose.yml ] || { echo "Run from the earthworks-monitor checkout"; exit 1; }

log() { printf '\n==> %s\n' "$*"; }

# --- Docker -----------------------------------------------------------------------------
if ! docker compose version >/dev/null 2>&1; then
  log "Installing Docker"
  apt-get update -q
  apt-get install -y -q ca-certificates curl
  . /etc/os-release
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc]" \
    "https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# --- Swap: stereo jobs can briefly need more memory than the server has ------------------
if [ -z "$(swapon --show --noheadings)" ]; then
  log "Adding an 8 GB swap file"
  fallocate -l 8G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- Firewall: SSH and web only ---------------------------------------------------------
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null
fi

# --- Address ----------------------------------------------------------------------------
DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  IP="$(curl -fsS4 https://api.ipify.org)"
  DOMAIN="${IP//./-}.sslip.io"   # public DNS name that resolves to this IP
fi

# --- Configuration (.env), generated once with random secrets ---------------------------
rand() { openssl rand -hex 32 | head -c "$1"; }
if [ ! -f .env ]; then
  log "Writing .env with new random passwords"
  DB_PW="$(rand 32)"
  sed -e "s|CHANGE-ME-db-password|${DB_PW}|g" \
      -e "s|^SECRET_KEY=.*|SECRET_KEY=$(rand 64)|" \
      -e "s|^COOKIE_SECURE=.*|COOKIE_SECURE=true|" \
      -e "s|^DEMO_ANALYST_PASSWORD=.*|DEMO_ANALYST_PASSWORD=$(rand 16)|" \
      -e "s|^DEMO_VIEWER_PASSWORD=.*|DEMO_VIEWER_PASSWORD=$(rand 16)|" \
      .env.example > .env
  chmod 600 .env
fi
if grep -q '^SITE_DOMAIN=' .env; then
  sed -i "s|^SITE_DOMAIN=.*|SITE_DOMAIN=${DOMAIN}|" .env
else
  printf '\n# Public address served by Caddy with HTTPS (deploy/compose.https.yml)\nSITE_DOMAIN=%s\n' "$DOMAIN" >> .env
fi
grep -q '^[^#]*CHANGE-ME' .env && { echo "Some CHANGE-ME values are still in .env; edit it and rerun."; exit 1; }

# --- Build and start --------------------------------------------------------------------
COMPOSE=(docker compose -f docker-compose.yml -f deploy/compose.https.yml)
log "Building images (the first build downloads Ames Stereo Pipeline and takes 15-30 minutes)"
"${COMPOSE[@]}" build
log "Starting"
"${COMPOSE[@]}" up -d

# --- Nightly backup at 02:30 server time ------------------------------------------------
cat > /etc/cron.d/earthworks-backup <<EOF
30 2 * * * root cd $(pwd) && bash deploy/backup.sh >> /var/log/earthworks-backup.log 2>&1
EOF

log "Waiting for the API"
for _ in $(seq 1 60); do
  "${COMPOSE[@]}" exec -T api python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" \
    >/dev/null 2>&1 && break
  sleep 5
done

env_get() { grep -m1 "^$1=" .env | cut -d= -f2-; }
cat <<EOF

Earthworks Monitor is running at  https://${DOMAIN}
(the certificate is issued on the first visit; allow a minute)

Demo sign-in:
  analyst  $(env_get DEMO_ANALYST_EMAIL)  /  $(env_get DEMO_ANALYST_PASSWORD)
  viewer   $(env_get DEMO_VIEWER_EMAIL)  /  $(env_get DEMO_VIEWER_PASSWORD)
(passwords are in $(pwd)/.env)

Logs:     ${COMPOSE[*]} logs -f api worker
Backups:  nightly to /var/backups/earthworks (deploy/backup.sh)
EOF
