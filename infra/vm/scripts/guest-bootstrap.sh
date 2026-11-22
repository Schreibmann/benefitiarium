#!/usr/bin/env bash
# Idempotent guest bootstrap for Benefitiarium always-on VM.
# Expects repo at /opt/benefitiarium and secrets at /etc/benefitiarium/env.
# Run as root (cloud-init / sudo) so systemd units can be installed.
set -euo pipefail

REPO_ROOT="${BENEFI_REPO_ROOT:-/opt/benefitiarium}"
ENV_FILE="${BENEFI_ENV_FILE:-/etc/benefitiarium/env}"
APP_USER="${BENEFI_APP_USER:-benefitiarium}"
UNIT_SRC="${REPO_ROOT}/infra/vm/systemd"
COMPOSE_TIMEOUT_SEC="${BENEFI_COMPOSE_TIMEOUT_SEC:-120}"

log() {
  echo "[guest-bootstrap] $*"
}

die() {
  echo "[guest-bootstrap] ERROR: $*" >&2
  exit 1
}

run_as_app() {
  if [[ "$(id -u)" -eq 0 ]]; then
    sudo -u "${APP_USER}" -H -- "$@"
  else
    "$@"
  fi
}

require_root_for_units() {
  if [[ "$(id -u)" -ne 0 ]]; then
    die "re-run with sudo to install/restart systemd units"
  fi
}

[[ -d "${REPO_ROOT}" ]] || die "repo root missing: ${REPO_ROOT}"
[[ -f "${ENV_FILE}" ]] || die "env file missing: ${ENV_FILE} (run Set-BenefitiariumEnv.ps1)"
[[ -d "${UNIT_SRC}" ]] || die "systemd units missing: ${UNIT_SRC}"

command -v docker >/dev/null 2>&1 || die "docker not installed"
command -v pnpm >/dev/null 2>&1 || die "pnpm not installed"
command -v node >/dev/null 2>&1 || die "node not installed"

cd "${REPO_ROOT}"

if [[ ! -e "${REPO_ROOT}/.env" ]]; then
  ln -sfn "${ENV_FILE}" "${REPO_ROOT}/.env"
  log "linked ${REPO_ROOT}/.env -> ${ENV_FILE}"
elif [[ -L "${REPO_ROOT}/.env" ]]; then
  ln -sfn "${ENV_FILE}" "${REPO_ROOT}/.env"
else
  log "keeping existing non-symlink ${REPO_ROOT}/.env"
fi

chown -h "${APP_USER}:${APP_USER}" "${REPO_ROOT}/.env" 2>/dev/null || true

log "starting Postgres via docker compose"
docker compose up -d

log "waiting for Postgres health"
deadline=$((SECONDS + COMPOSE_TIMEOUT_SEC))
until docker compose exec -T postgres pg_isready -U postgres -d moex >/dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    docker compose ps || true
    die "Postgres did not become healthy within ${COMPOSE_TIMEOUT_SEC}s"
  fi
  sleep 2
done

log "pnpm install"
run_as_app pnpm install --frozen-lockfile

log "build workspace (packages + api + worker-notifier)"
run_as_app pnpm --filter @moex/api... build
run_as_app pnpm --filter @moex/worker-notifier... build

log "apply migrations"
run_as_app pnpm db:migrate

require_root_for_units

log "install systemd units"
install -m 0644 "${UNIT_SRC}/benefitiarium-api.service" /etc/systemd/system/benefitiarium-api.service
install -m 0644 "${UNIT_SRC}/benefitiarium-web.service" /etc/systemd/system/benefitiarium-web.service
install -m 0644 "${UNIT_SRC}/benefitiarium-worker-notifier.service" /etc/systemd/system/benefitiarium-worker-notifier.service

systemctl daemon-reload
systemctl enable benefitiarium-api.service benefitiarium-web.service benefitiarium-worker-notifier.service
systemctl restart benefitiarium-api.service benefitiarium-web.service benefitiarium-worker-notifier.service

log "service status"
systemctl --no-pager --full status benefitiarium-api.service benefitiarium-web.service benefitiarium-worker-notifier.service || true

log "done — open http://<vm-ip>:5173 (Live Mode still starts from the UI)"
