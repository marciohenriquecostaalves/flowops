# Produção

Esta configuração prepara o FlowOps para rodar em um servidor Docker com proxy reverso. Ela não cria um provedor de nuvem nem configura DNS automaticamente.

## Arquitetura

- Os serviços web e api são construídos a partir do commit implantado.
- PostgreSQL e Redis ficam em rede privada, sem portas publicadas no host.
- Web e API escutam apenas em 127.0.0.1; o proxy reverso deve fornecer HTTPS e encaminhar as requisições.
- As migrações são aplicadas antes da inicialização da API.
- Swagger fica disponível em desenvolvimento e homologação, mas é desabilitado em NODE_ENV=production.

## Pré-requisitos

No servidor:

- Docker Engine com Compose;
- DNS apontando para o servidor;
- proxy reverso (Nginx, Caddy ou equivalente) com TLS válido;
- armazenamento externo para backups;
- secrets armazenados fora do Git, preferencialmente em um secret manager.

## Configuração inicial

Na raiz do projeto:

```bash
cp deploy/production.env.example deploy/production.env
openssl rand -hex 32
```

Substitua todos os valores de exemplo em deploy/production.env. Gere secrets diferentes para PROD_JWT_ACCESS_SECRET e PROD_JWT_REFRESH_SECRET, com pelo menos 32 caracteres. A senha de PROD_DATABASE_URL deve ser exatamente a mesma de PROD_POSTGRES_PASSWORD.

Defina PROD_PUBLIC_API_URL e PROD_CORS_ORIGIN com URLs HTTPS reais. O arquivo deploy/production.env é ignorado pelo Git.

## Subida e validação

```bash
pnpm production:up
pnpm production:smoke
```

Verifique também:

```bash
docker compose --env-file deploy/production.env -p flowops-production -f docker-compose.production.yml ps
```

O primeiro usuário deve ser criado por um procedimento controlado de administração. Não existe comando production:seed, de propósito: dados de demonstração nunca devem ser inseridos em produção.

## Proxy reverso

Encaminhe o domínio da aplicação para http://127.0.0.1:3000 e o domínio da API para http://127.0.0.1:4000. Configure HTTPS, redirecionamento de HTTP para HTTPS e cabeçalhos de proxy. O domínio da API deve terminar com /api conforme PROD_PUBLIC_API_URL.

## Backup e restauração

Prefira backup automatizado do PostgreSQL gerenciado ou do volume em armazenamento externo. Para usar os scripts do projeto com o Compose de produção:

```bash
FLOWOPS_COMPOSE_FILE=docker-compose.production.yml \
FLOWOPS_COMPOSE_PROJECT=flowops-production \
FLOWOPS_COMPOSE_ENV_FILE=deploy/production.env \
pnpm db:backup -- /caminho/seguro/para/backups
```

Antes de restaurar, confirme uma janela de manutenção e faça um backup adicional:

```bash
FLOWOPS_COMPOSE_FILE=docker-compose.production.yml \
FLOWOPS_COMPOSE_PROJECT=flowops-production \
FLOWOPS_COMPOSE_ENV_FILE=deploy/production.env \
FLOWOPS_CONFIRM_RESTORE=YES \
pnpm db:restore -- /caminho/backup.dump
```

Teste restaurações regularmente em uma base separada. Nunca use down -v sem um procedimento aprovado: isso remove os volumes locais.

## Atualização e rollback

1. Faça backup antes da atualização.
2. Implante um commit conhecido e rode pnpm production:up.
3. Aguarde os health checks e execute pnpm production:smoke.
4. Em caso de falha, volte ao commit anterior e suba novamente.

As migrações Prisma são progressivas. Rollback de código não desfaz automaticamente alterações de banco; para mudanças incompatíveis, prepare uma migração reversível antes do deploy.

```bash
pnpm production:logs
pnpm production:down
```

production:down preserva os volumes. Use-o somente durante uma manutenção planejada.

## Checklist antes de abrir ao público

- [ ] DNS e HTTPS configurados;
- [ ] secrets fortes e exclusivos carregados fora do Git;
- [ ] backup automático e restauração testada;
- [ ] firewall permitindo somente 80/443 e acesso administrativo;
- [ ] monitoramento dos endpoints /api/health/live e /api/health/ready;
- [ ] política de retenção de logs definida;
- [ ] usuário administrador com senha inicial alterada;
- [ ] smoke test aprovado após o deploy.
