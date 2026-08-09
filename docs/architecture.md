# FlowOps — Arquitetura Fase 1

## Decisões

O projeto utiliza monorepo para manter frontend, backend e pacotes compartilhados no mesmo ciclo de versionamento.

### Multi-tenant

Toda entidade operacional pertence a um `tenantId`. O contexto do tenant é obtido do JWT após autenticação. Serviços devem sempre filtrar consultas por `tenantId`.

### Autenticação

Access token curto + refresh token rotativo. O hash do refresh token é persistido no banco; o token em claro não é armazenado.

### RBAC

Papéis (`Role`) são associados a usuários através de `UserRole`. Permissões (`Permission`) são associadas a papéis através de `RolePermission`.

## Próxima evolução

- PermissionGuard por permissão
- tenant resolver
- cookies HttpOnly para refresh
- rotação/revogação de sessões
- MFA
- Redis para rate limiting
- eventos e filas
