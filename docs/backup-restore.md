# Backup e restauração

Os backups locais do PostgreSQL são gerados no formato customizado do `pg_dump` e ficam em `backups/`, que é ignorado pelo Git.

## Criar backup

Com o Docker em execução, na raiz do projeto:

```bash
pnpm db:backup
```

Também é possível informar outra pasta:

```bash
pnpm db:backup -- /caminho/seguro/para/backups
```

O comando retorna o caminho exato do arquivo `.dump` criado. Em um ambiente real, copie esse arquivo para armazenamento externo e protegido.

## Restaurar backup

A restauração substitui os dados atuais do banco. Primeiro confirme que o arquivo escolhido é o correto e, depois, execute:

```bash
FLOWOPS_CONFIRM_RESTORE=YES pnpm db:restore -- backups/flowops-AAAAMMDD-HHMMSS.dump
```

Sem `FLOWOPS_CONFIRM_RESTORE=YES`, o comando não altera nada. Após restaurar, valide o login, os usuários, as sessões e os relatórios.

## Rotina recomendada

- criar backup diário em produção;
- manter cópias fora da máquina do servidor;
- proteger os arquivos com controle de acesso;
- testar restauração periodicamente em uma base separada;
- nunca versionar arquivos `.dump`.

O limitador de login desta fase é local ao processo. Em produção com múltiplas instâncias, ele deve ser movido para um armazenamento compartilhado, como Redis, antes do balanceamento de carga.
