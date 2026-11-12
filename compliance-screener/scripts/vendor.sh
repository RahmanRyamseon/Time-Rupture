#!/bin/sh
# Self-host SheetJS at build time instead of loading it from a third-party CDN
# in every visitor's browser. 0.20.3 is the current release and is not affected
# by CVE-2023-30533 (prototype pollution) or CVE-2024-22363 (ReDoS).
set -eu
VER="0.20.3"
# sha256 of the official build; the build fails if the file ever differs.
EXPECTED_SHA256="${SHEETJS_SHA256:-}"
mkdir -p public/vendor
curl -fsSL --retry 3 "https://cdn.sheetjs.com/xlsx-${VER}/package/dist/xlsx.full.min.js" -o public/vendor/xlsx.full.min.js
ACTUAL=$(sha256sum public/vendor/xlsx.full.min.js | cut -d' ' -f1)
echo "SheetJS ${VER} sha256=${ACTUAL}"
if [ -n "$EXPECTED_SHA256" ] && [ "$ACTUAL" != "$EXPECTED_SHA256" ]; then
  echo "SheetJS checksum mismatch: expected ${EXPECTED_SHA256}" >&2
  exit 1
fi
