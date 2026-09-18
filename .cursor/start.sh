#!/usr/bin/env bash
# Per-boot startup for the Cloud Agent environment. Starts the local database
# (its data directory persists in the snapshot) and applies any pending
# migrations. Dependency installation and seeding live in install.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

bash "${SCRIPT_DIR}/write-env.sh"

# Export local dev vars (DATABASE_URL, etc.) for downstream Prisma commands.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

bash "${SCRIPT_DIR}/postgres.sh"

if [ -d node_modules ]; then
  # Keep the local development database in sync with the current Prisma schema.
  # See install.sh for why db push is used instead of migrate deploy.
  echo "==> Syncing database schema (prisma db push)"
  npx prisma db push --skip-generate
fi

echo "==> Environment start complete"
