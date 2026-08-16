# FlowOps — Fase 1

Plataforma SaaS de gestão operacional e produtividade para operações logísticas.

## Stack

- Node.js 22+
- pnpm 10+
- Turborepo
- Next.js + TypeScript
- NestJS + TypeScript
- PostgreSQL 17
- Prisma
- Redis 8
- JWT + Refresh Token
- RBAC
- Multi-tenant

## Estrutura

```text
apps/
  api/       NestJS
  web/       Next.js
packages/
  database/  Prisma schema + client
  shared/    contratos e utilitários compartilhados
```

## Requisitos

- Node.js 22+
- pnpm 10+
- Docker Desktop

## Inicialização

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Para produção, defina `NODE_ENV=production` e substitua os dois secrets JWT por valores aleatórios exclusivos. A API recusará iniciar com secrets de exemplo ou inválidos.

Frontend: http://localhost:3000
API: http://localhost:4000/api
Swagger: http://localhost:4000/api/docs

Health checks:
- `GET /api/health/live` confirma que o processo está ativo;
- `GET /api/health/ready` confirma que a API consegue acessar o PostgreSQL;
- `X-Request-Id` identifica cada requisição e os logs da API são emitidos em JSON, sem dados sensíveis.

Homologação local com containers: consulte [docs/staging.md](docs/staging.md). Ela usa portas e volumes próprios, separados do ambiente de desenvolvimento.

Usuário seed:
- e-mail: admin@flowops.local
- senha: ChangeMe123!

Altere a senha imediatamente em qualquer ambiente real.

## Produção

Esta fase é uma fundação de desenvolvimento. Antes de produção devem ser adicionados, entre outros:

- secrets manager
- HTTPS
- observabilidade
- backups e restore testado
- rate limiting distribuído
- MFA
- gestão de sessões/dispositivos
- CI/CD com ambientes
- infraestrutura cloud
- políticas de retenção/auditoria
- testes E2E e carga
