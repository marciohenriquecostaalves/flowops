# Homologação local

O ambiente de homologação executa API, frontend, PostgreSQL e Redis em containers separados dos serviços de desenvolvimento. Ele usa o projeto Compose `flowops-staging`, além das portas `3300` (web), `4400` (API), `55432` (PostgreSQL) e `56379` (Redis) por padrão.

## Primeiro uso

```bash
cp deploy/staging.env.example deploy/staging.env
```

Edite `deploy/staging.env` e substitua todos os valores de exemplo. Os secrets JWT precisam ter pelo menos 32 caracteres, ser aleatórios e diferentes entre si. Esse arquivo é ignorado pelo Git e nunca deve ser enviado ao repositório.

Suba a homologação:

```bash
pnpm staging:up
```

O container da API aplica as migrações pendentes antes de iniciar. Os health checks só liberam o frontend depois que a API e o PostgreSQL estiverem prontos.

Para carregar os dados demonstrativos na primeira homologação:

```bash
pnpm staging:seed
```

O usuário inicial é `admin@flowops.local` com a senha `ChangeMe123!`. Troque essa senha antes de compartilhar o ambiente.

## Smoke test

```bash
pnpm staging:smoke
```

Acesse `http://localhost:3300` para validar o fluxo pelo navegador. Os endpoints de diagnóstico são:

- `http://localhost:4400/api/health/live` — processo ativo;
- `http://localhost:4400/api/health/ready` — API e PostgreSQL prontos.

## Logs e encerramento

```bash
pnpm staging:logs
pnpm staging:down
```

`staging:down` preserva os volumes. Não use `docker compose down -v` em uma homologação que precise manter dados.

## Rollback

1. Pare apenas `web` e `api`:

   ```bash
   docker compose --env-file deploy/staging.env -p flowops-staging -f docker-compose.staging.yml stop web api
   ```

2. Volte o código para o commit conhecido como estável.
3. Suba novamente com `pnpm staging:up`.

As migrações do Prisma são aplicadas para frente. Se uma alteração de schema já tiver sido aplicada, faça backup antes de qualquer restauração e não tente apagar migrações manualmente.
