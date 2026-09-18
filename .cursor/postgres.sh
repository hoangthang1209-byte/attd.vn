#!/usr/bin/env bash
# Idempotently provision and start a local PostgreSQL cluster for the Cloud Agent
# development environment. Runs as the unprivileged `ubuntu` user against a data
# directory in $HOME so it needs no root privileges at boot time.
set -euo pipefail

PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
if [ -z "${PG_BIN}" ]; then
  echo "PostgreSQL server binaries not found under /usr/lib/postgresql. Install postgresql first." >&2
  exit 1
fi
export PATH="${PG_BIN}:${PATH}"

PGDATA="${PGDATA:-${HOME}/.attd-pgdata}"
PGPORT="${PGPORT:-5432}"
PGDB="${PGDATABASE:-attd}"
LOGFILE="${HOME}/.attd-pg.log"
SOCKET_DIR="/tmp"

if [ ! -s "${PGDATA}/PG_VERSION" ]; then
  echo "Initializing PostgreSQL cluster at ${PGDATA}"
  mkdir -p "${PGDATA}"
  initdb -D "${PGDATA}" -U postgres --auth=trust --auth-host=trust >/dev/null
  {
    echo "listen_addresses = 'localhost'"
    echo "unix_socket_directories = '${SOCKET_DIR}'"
    echo "port = ${PGPORT}"
  } >> "${PGDATA}/postgresql.conf"
fi

if ! pg_ctl -D "${PGDATA}" status >/dev/null 2>&1; then
  echo "Starting PostgreSQL cluster (port ${PGPORT})"
  pg_ctl -D "${PGDATA}" -l "${LOGFILE}" -o "-p ${PGPORT} -k ${SOCKET_DIR}" -w start
else
  echo "PostgreSQL cluster already running"
fi

for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p "${PGPORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! psql -h 127.0.0.1 -p "${PGPORT}" -U postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${PGDB}'" | grep -q 1; then
  echo "Creating database '${PGDB}'"
  psql -h 127.0.0.1 -p "${PGPORT}" -U postgres -c "CREATE DATABASE ${PGDB}" >/dev/null
fi

echo "PostgreSQL is ready on 127.0.0.1:${PGPORT} (database: ${PGDB})"
