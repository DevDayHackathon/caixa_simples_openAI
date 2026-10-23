# Entregas

Quatro tarefas locais, executadas na ordem. Gate completo: `npm run check` com Postgres local e `PSQL_PATH` configurados. Commit por entrega, seguido de verificador independente ao concluir.

- [x] I1 Infraestrutura reproduzível: fallback psql multiplataforma, instruções e workflow CI com Postgres; provar gate existente. Tests: integration/e2e. Gate: full.
- [ ] I2 Leitura agregada autenticada: snapshot, compromissos e business da mesma leitura, com sessão/origem/erros existentes; testes de 200/401/422/503 e consistência. Tests: integration. Gate: full.
- [ ] I3 Área `/caixa`: adaptadores injetáveis, sessão, atualização consistente, limpeza de hipótese, ações manuais confirmadas e erros recuperáveis; E2E com CSV, previsão, criação, reserva, liquidação e recarga. Tests: unit/e2e. Gate: full.
- [ ] I4 Preparação de integração: estados honestos do agente/voz, documentação de ativação e limites, revisão independente com sensor. Tests: unit/e2e. Gate: full.

I1: npm run check PASS: 99 unitários, 52 integração SQL, 7 E2E; lint/tipos/build. Workflow preparado, execução hospedada somente após push. INT-05: guarda loopback em persistence.test.ts; suíte financeira completa prova escritas/recarga sem mocks de banco.
