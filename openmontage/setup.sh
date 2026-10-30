#!/usr/bin/env bash
# Keyless OpenMontage setup.
#
# Clones OpenMontage and installs its Python and Node dependencies with no API
# keys configured. Piper offline narration, open archival footage and
# Remotion/FFmpeg rendering all work without any key; adding keys to the
# generated .env later unlocks the paid cloud providers.
#
# Usage:   ./openmontage/setup.sh
# Options: OPENMONTAGE_DIR=/path   where to install (default ~/openmontage/OpenMontage)
#          OPENMONTAGE_REF=main    track upstream instead of the pinned commit
set -euo pipefail

REPO_URL="${OPENMONTAGE_REPO:-https://github.com/calesthio/OpenMontage.git}"
# Pinned to the commit verified on 2026-10-29. Set OPENMONTAGE_REF=main to track upstream.
REF="${OPENMONTAGE_REF:-195eab24478dc9363326aec437aefc3701635ddf}"
DEST="${OPENMONTAGE_DIR:-$HOME/openmontage/OpenMontage}"

say() { printf '==> %s\n' "$1"; }

# ---- Prerequisites ----
say "Checking prerequisites"
missing=()
for cmd in git python3 node npm ffmpeg; do
  command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "ERROR: missing required tools: ${missing[*]}" >&2
  echo "Install them first. OpenMontage needs Python 3.10+, Node 18+ and FFmpeg." >&2
  exit 1
fi
python3 -c 'import sys; raise SystemExit(0 if sys.version_info[:2] >= (3, 10) else 1)' || {
  echo "ERROR: Python 3.10+ is required (found $(python3 -V 2>&1))." >&2
  exit 1
}
printf '    python3 %s, node %s, ffmpeg present\n' \
  "$(python3 -V 2>&1 | cut -d' ' -f2)" "$(node --version)"

# ---- Source ----
if [ -d "$DEST/.git" ]; then
  say "Updating existing checkout at $DEST"
else
  say "Cloning OpenMontage into $DEST"
  mkdir -p "$DEST"
  git -C "$DEST" init --quiet
  git -C "$DEST" remote add origin "$REPO_URL"
fi
# Shallow-fetch the pinned commit (or branch) rather than the whole history.
git -C "$DEST" fetch --depth 1 --quiet origin "$REF"
git -C "$DEST" checkout --quiet --force FETCH_HEAD
printf '    at %s\n' "$(git -C "$DEST" rev-parse --short HEAD)"

cd "$DEST"

# ---- Python ----
say "Installing Python dependencies"
[ -x .venv/bin/python ] || python3 -m venv .venv
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet -r requirements.txt

say "Installing Piper offline TTS (the keyless narration path)"
.venv/bin/python -m pip install --quiet piper-tts \
  || echo "    [skip] piper-tts failed to install; narration would need a cloud key"

# ---- Node ----
say "Installing the Remotion composer"
( cd remotion-composer && npm install --no-fund --no-audit )

say "Warming the HyperFrames npx cache"
npx --yes hyperframes --version >/dev/null 2>&1 \
  && echo "    cached" \
  || echo "    [skip] offline or npm unavailable; the first render will fetch it"

# ---- Config ----
if [ -f .env ]; then
  say ".env already exists, leaving it alone"
else
  say "Creating .env from .env.example (no keys set)"
  cp .env.example .env
fi

# ---- Verify ----
say "Verifying the install"
.venv/bin/python -I -c '
import importlib
mods = ["yaml", "pydantic", "jsonschema", "dotenv", "PIL", "numpy", "requests",
        "google.auth", "google.genai", "openai", "fastapi", "uvicorn",
        "watchfiles", "websockets", "piper"]
bad = []
for m in mods:
    try:
        importlib.import_module(m)
    except Exception as exc:
        bad.append(f"{m} ({type(exc).__name__})")
if bad:
    raise SystemExit("FAILED to import: " + ", ".join(bad))
print(f"    {len(mods)}/{len(mods)} core modules import cleanly")
'

cat <<EOF

Done. OpenMontage is installed keyless at:
  $DEST

Open that directory in your AI coding assistant to start creating. Optional
next steps, run from there:
  make preflight            full environment check
  make hyperframes-doctor   validate the HyperFrames runtime
  \$EDITOR .env              add API keys to unlock paid cloud providers
EOF
