#!/usr/bin/env bash
set -euo pipefail

backup_file="${1:-}"

if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
  echo "Uso: FLOWOPS_CONFIRM_RESTORE=YES pnpm db:restore -- caminho/do/backup.dump" >&2
  exit 1
fi

if [[ "${FLOWOPS_CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "A restauração substitui os dados atuais. Para confirmar, defina FLOWOPS_CONFIRM_RESTORE=YES." >&2
  exit 1
fi

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

if ! docker compose "${compose_args[@]}" ps --status running --services | grep -qx "$db_service"; then
  echo "O serviço postgres não está em execução. Inicie com: docker compose up -d postgres" >&2
  exit 1
fi

docker compose "${compose_args[@]}" exec -T "$db_service" pg_restore \
  -U "$db_user" \
  -d "$db_name" \
  --clean \
  --if-exists \
  --no-owner \
  < "$backup_file"

echo "Restauração concluída a partir de: $backup_file"
