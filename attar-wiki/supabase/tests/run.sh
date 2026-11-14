#!/usr/bin/env bash
# Applies the migrations to a fresh database on a local Postgres and runs behaviour tests.
# Usage: PGHOST=/tmp PGPORT=5544 PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
DB=attar_wiki_test_$$
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
cat supabase_stub.sql ../migrations/*.sql | psql -d "$DB" -v ON_ERROR_STOP=1 -q
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f behaviour.sql | grep -E "PASSED|ERROR" || true
