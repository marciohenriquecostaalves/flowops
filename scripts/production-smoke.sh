#!/usr/bin/env bash
set -euo pipefail

env_file="${FLOWOPS_PRODUCTION_ENV_FILE:-deploy/production.env}"
if [[ -f "$env_file" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
fi

api_url="${PROD_API_SMOKE_URL:-http://127.0.0.1:${PROD_API_PORT:-4000}/api}"
web_url="${PROD_WEB_SMOKE_URL:-http://127.0.0.1:${PROD_WEB_PORT:-3000}}"

curl --fail --silent --show-error "${api_url}/health/live" >/dev/null
curl --fail --silent --show-error "${api_url}/health/ready" >/dev/null
curl --fail --silent --show-error "${web_url}" >/dev/null

echo "Smoke test de produção aprovado."
