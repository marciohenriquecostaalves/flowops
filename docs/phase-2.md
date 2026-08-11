# Fase 2 — Core Operacional

## Modelo operacional

Uma `ActivitySession` representa uma execução de trabalho de um colaborador em uma atividade.

Estados:

```text
RUNNING → PAUSED → RUNNING → COMPLETED
             └──────────────→ COMPLETED
```

`productiveSeconds` representa o tempo efetivamente produtivo.

`units` representa o volume processado.

A produtividade inicial é:

```text
produtividade/h = unidades / segundos produtivos × 3600
```

## Regras implementadas

1. Um colaborador não pode ter duas sessões abertas.
2. O colaborador precisa estar ativo.
3. A atividade precisa estar ativa.
4. Employee, Activity, Department e Shift são validados dentro do tenant.
5. Sessões abertas podem ser pausadas, retomadas e finalizadas.
6. O ranking considera sessões concluídas.
7. A API nunca aceita `tenantId` vindo do cliente; usa o tenant do JWT.

## Limitações deliberadas desta fase

- Persistência de cronômetro é server-side, mas atualização da UI ainda é polling/manual.
- Produtividade não considera ainda perdas, microparadas, horas planejadas ou eficiência contra meta.
- RBAC possui estrutura de dados, mas os guards de permissão fina entram na fase de segurança.
