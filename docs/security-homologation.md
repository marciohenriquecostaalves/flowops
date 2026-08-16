# Homologação de segurança e perfis

Esta etapa valida os quatro perfis do FlowOps e evita regressões nas permissões.

## Teste automatizado

O teste E2E usa um tenant temporário e não depende dos dados da demonstração. Para executá-lo localmente, use um banco de teste isolado:

```bash
FLOWOPS_E2E=true pnpm test:e2e
```

O teste cria os perfis, valida os endpoints HTTP e remove o tenant temporário ao final.

## Matriz mínima de homologação

| Perfil | Deve acessar | Deve ser bloqueado |
| --- | --- | --- |
| Administrador | usuários, configurações, operação, relatórios e auditoria | — |
| Supervisor | colaboradores, cadastros operacionais, operação e relatórios | usuários e configurações |
| Operador | operação própria, histórico e seu colaborador | relatórios, usuários e cadastros administrativos |
| Encarregado | visão geral e relatório do próprio departamento | colaboradores, usuários e configurações |

Também são verificados:

- token de usuário suspenso rejeitado imediatamente;
- operador limitado ao próprio colaborador;
- encarregado limitado ao departamento vinculado;
- tentativa de atualizar sessão encerrada rejeitada;
- alterações registradas com estado anterior e posterior na auditoria.

O workflow `.github/workflows/ci.yml` executa essas verificações em cada pull request e em cada envio para `main`.
