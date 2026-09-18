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

ensure_var "DATABASE_URL" "postgresql://postgres@127.0.0.1:5432/attd?schema=public"
# Dev-only admin gate so the /admin backoffice is reachable locally.
ensure_var "ADMIN_PASSWORD" "attd-dev-admin"
ensure_var "ADMIN_SESSION_SECRET" "attd-dev-session-secret-change-me"
ensure_var "NEXT_PUBLIC_SITE_URL" "http://localhost:3000"
