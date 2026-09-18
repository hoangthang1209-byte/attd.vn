#!/usr/bin/env bash
# Repository bootstrap for the Cloud Agent environment. Idempotent: safe to run
# repeatedly. Installs dependencies, provisions the local database, applies
# migrations and seeds baseline reference data.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

echo "==> Installing npm dependencies"
npm ci

echo "==> Writing local development .env"
bash "${SCRIPT_DIR}/write-env.sh"

# Export the local dev vars so every downstream command sees DATABASE_URL.
# The Prisma CLI auto-loads .env, but the seed runs Prisma Client via tsx which
# does not, so we source it explicitly here.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

echo "==> Ensuring local PostgreSQL is running"
bash "${SCRIPT_DIR}/postgres.sh"

# The committed migration history cannot be replayed onto an empty database
# (prisma/migrations/0001_init.sql is a loose file rather than a migration
# directory, so the base tables are never created). For the local, throwaway
# development database we therefore sync the current Prisma schema directly with
# `db push` instead of `migrate deploy`. This never touches production.
echo "==> Syncing database schema (prisma db push)"
npx prisma db push --skip-generate

echo "==> Seeding baseline reference data"
npx tsx prisma/seed.ts

echo "==> Install complete"
