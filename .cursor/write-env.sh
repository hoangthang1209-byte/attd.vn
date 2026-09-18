#!/usr/bin/env bash
# Ensure a local development .env exists for the Cloud Agent environment.
# Only local, non-secret development defaults are written here. Real secrets
# (payment, cloud storage, AI providers) must be supplied via environment
# secrets, never committed. Existing values in .env are preserved.
set -euo pipefail

ENV_FILE="${WORKSPACE_DIR:-/workspace}/.env"
touch "${ENV_FILE}"

ensure_var() {
  local key="$1"
  local value="$2"
  if ! grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    echo "${key}=${value}" >> "${ENV_FILE}"
    echo "Set ${key} in .env"
  fi
}

random_alnum() {
  local length="$1"
  openssl rand -base64 96 | tr -dc 'A-Za-z0-9' | head -c "${length}"
}

ensure_var "DATABASE_URL" "postgresql://postgres@127.0.0.1:5432/attd?schema=public"
# Generate per-environment dev-only admin credentials instead of committing
# predictable defaults. Values are written only to the gitignored local .env.
ensure_var "ADMIN_PASSWORD" "$(random_alnum 24)"
ensure_var "ADMIN_SESSION_SECRET" "$(random_alnum 64)"
ensure_var "NEXT_PUBLIC_SITE_URL" "http://localhost:3000"
