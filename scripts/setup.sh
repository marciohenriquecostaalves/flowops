#!/usr/bin/env bash
set -euo pipefail

cp -n .env.example .env || true
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed

echo ""
echo "FlowOps iniciado."
echo "Web:     http://localhost:3000"
echo "API:     http://localhost:4000/api"
echo "Swagger: http://localhost:4000/api/docs"
