#!/usr/bin/env bash
set -euo pipefail

backup_dir="${1:-backups}"
mkdir -p "$backup_dir"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_file="$backup_dir/flowops-$timestamp.dump"

if ! docker compose ps --status running --services | grep -qx postgres; then
  echo "O serviço postgres não está em execução. Inicie com: docker compose up -d postgres" >&2
  exit 1
fi

docker compose exec -T postgres pg_dump \
  -U flowops \
  -d flowops \
  --format=custom > "$backup_file"

echo "Backup criado: $backup_file"
