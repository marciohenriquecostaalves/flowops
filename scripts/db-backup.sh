#!/usr/bin/env bash
set -euo pipefail

backup_dir="${1:-backups}"
if [[ "$backup_dir" == "--" ]]; then
  backup_dir="${2:-backups}"
fi
mkdir -p "$backup_dir"

compose_args=()
if [[ -n "${FLOWOPS_COMPOSE_ENV_FILE:-}" ]]; then
  compose_args+=(--env-file "$FLOWOPS_COMPOSE_ENV_FILE")
fi
if [[ -n "${FLOWOPS_COMPOSE_PROJECT:-}" ]]; then
  compose_args+=(-p "$FLOWOPS_COMPOSE_PROJECT")
fi
if [[ -n "${FLOWOPS_COMPOSE_FILE:-}" ]]; then
  compose_args+=(-f "$FLOWOPS_COMPOSE_FILE")
fi

db_service="${FLOWOPS_DB_SERVICE:-postgres}"
db_user="${FLOWOPS_DB_USER:-flowops}"
db_name="${FLOWOPS_DB_NAME:-flowops}"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_file="$backup_dir/flowops-$timestamp.dump"

if ! docker compose "${compose_args[@]}" ps --status running --services | grep -qx "$db_service"; then
  echo "O serviço postgres não está em execução. Inicie com: docker compose up -d postgres" >&2
  exit 1
fi

docker compose "${compose_args[@]}" exec -T "$db_service" pg_dump \
  -U "$db_user" \
  -d "$db_name" \
  --format=custom > "$backup_file"

echo "Backup criado: $backup_file"
