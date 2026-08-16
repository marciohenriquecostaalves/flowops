# Changelog

## 0.1.1 — 2026-08-16

### Segurança e confiabilidade

- bloqueio de batidas para colaboradores inativos ou desligados;
- intervalo mínimo configurável entre leituras do mesmo crachá;
- serialização transacional por colaborador no quiosque;
- restrição de uma única sessão ativa por colaborador;
- testes de concorrência e restauração de backup.

### Operação

- quiosque com sequência `START`, `PAUSE`, `RESUME` e `FINISH`;
- crachás automáticos e etiquetas QR;
- histórico paginado e exportação das batidas;
- preparação de ambientes de homologação e produção.
