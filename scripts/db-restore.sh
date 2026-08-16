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

if ! docker compose ps --status running --services | grep -qx postgres; then
  echo "O serviço postgres não está em execução. Inicie com: docker compose up -d postgres" >&2
  exit 1
fi

docker compose exec -T postgres pg_restore \
  -U flowops \
  -d flowops \
  --clean \
  --if-exists \
  --no-owner \
  < "$backup_file"

echo "Restauração concluída a partir de: $backup_file"
