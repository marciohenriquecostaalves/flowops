#!/usr/bin/env bash
set -euo pipefail

api_url="${STAGING_PUBLIC_API_URL:-http://localhost:4400/api}"
web_url="${STAGING_WEB_URL:-http://localhost:3300}"

curl --fail --silent --show-error "${api_url}/health/live" >/dev/null
curl --fail --silent --show-error "${api_url}/health/ready" >/dev/null
curl --fail --silent --show-error "${web_url}" >/dev/null

echo "Smoke test da homologação aprovado."
