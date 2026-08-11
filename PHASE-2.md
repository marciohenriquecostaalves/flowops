# FlowOps — Fase 2: Core Operacional

Esta fase adiciona o núcleo operacional da plataforma:

- cadastro e gestão de colaboradores
- departamentos
- turnos/jornadas
- atividades operacionais
- início/pausa/retomada/finalização de sessões
- unidades produzidas
- metas por hora
- cálculo de produtividade
- dashboard operacional básico
- APIs REST para o núcleo operacional

## Aplicação

Copie os arquivos desta pasta sobre a raiz do projeto da Fase 1.

Depois:

```bash
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Endpoints principais:

- `GET /api/employees`
- `POST /api/employees`
- `PATCH /api/employees/:id`
- `GET /api/departments`
- `POST /api/departments`
- `GET /api/activities`
- `POST /api/activities`
- `PATCH /api/activities/:id`
- `GET /api/shifts`
- `POST /api/shifts`
- `POST /api/operations/sessions/start`
- `POST /api/operations/sessions/:id/pause`
- `POST /api/operations/sessions/:id/resume`
- `POST /api/operations/sessions/:id/finish`
- `PATCH /api/operations/sessions/:id/units`
- `GET /api/operations/sessions/active`
- `GET /api/operations/productivity`
