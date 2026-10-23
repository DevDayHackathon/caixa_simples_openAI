# Evidências Daniel — T2–T8

Data: 2026-10-23. Branch: feat/daniel-caixa-dados; base eaa8068, comum às três branches.

Skills: karpathy-guidelines aplicada; tlc-spec-driven indisponível e comunicada antes da implementação. Verificação da feature completa permanece pendente nas demais frentes. Na entrega inicial não houve push, deploy ou migração remota.

Preflight: npm ci e npm run check passaram (15 unitários, 6 integração, 3 E2E). Chromium instalado pelo script da base. Postgres 17.11 portátil EDB em output/ ignorado, loopback:55432; sem Docker disponível. Banco temporário exclusivo por suíte, removido ao terminar; mesmas funções SQL da produção, transporte psql local em vez de HTTPS Supabase.

## T2

Persistencia: recarga por adaptador novo, CAS antigo rejeitado, escopo demo, historico por versao, RLS/RPC bloqueadas e guarda loopback. Testes: tests/integration/finance/persistence.test.ts. Gate: 15 unitarios, 12 integracao, 3 E2E, lint/tipos/build.

Gate: npm run check, sem skip/remoção. Casos novos: 6. Log: output/finance-local/t2-gate.log.

## T3

CSV: F1, retry, reimportacao identica, rollback com linha invalida/conflitante, IDs repetidos, limites UTF8/1000, datas/cabecalho, RFC4180, concorrencia e expiracao/stale. Testes: tests/integration/finance/import.test.ts. Previa parseada expira em 30 minutos; CSV bruto descartado. Gate: 15 unitarios, 22 integracao, 3 E2E.

Gate: npm run check, sem skip/remoção. Casos novos: 10. Log: output/finance-local/t3-gate.log.

## T4

Calculo puro: F1 100000/300000/150000, janela fixa ate 21/11, vazio/zero, abertura, realizados, incerteza, dividas vencidas, reservas, overflow e escopo. Somatorios BigInt validados como centavos seguros. Testes: src/features/finance/cash.test.ts. Gate quick: 25 unitarios, lint e tipos verdes.

Gate quick: npm run test:unit, além de lint/tipos; sem skip/remoção. Casos novos: 10. Log: output/finance-local/t4-gate.log.

## T5

Criacao idempotente, alteracao com vencimento preservado, CAS concorrente, liquidacao unica, finais imutaveis, cancelamento/liberacao, chave conflitante e rollback de gancho. finance_resolutions permite a Bruno anexar trigger em 002_tasks.sql na mesma transacao; tarefas reais continuam responsabilidade de T12/T13/T21. Testes: tests/integration/finance/transactions.test.ts. Gate: 25 unitarios, 30 integracao, 3 E2E.

Gate: npm run check, sem skip/remoção. Casos novos: 8. Log: output/finance-local/t5-gate.log.

## T6

Simulacao F1: -50000 em todos os dias 27-31/10, recuperacao 150000 em 01/11, affected_dates exatas, base preservada, atraso alem da janela, valor hipotetico, versao/ID/duplicata/finais/overflow. Testes: src/features/finance/scenarios.test.ts. Gate quick: 31 unitarios, lint e tipos verdes.

Gate quick: npm run test:unit, além de lint/tipos; sem skip/remoção. Casos novos: 6. Log: output/finance-local/t6-gate.log.

## T7

F2 saldo100000/reserva50000/livre50000, reconfirmacao, pagamento saldo50000 e reserva0, excesso com disponivel, limite devido/tipo/final, concorrencia, conflito de valor/reducao e stale. Testes: tests/integration/finance/reservations.test.ts. Gate: 31 unitarios, 38 integracao, 3 E2E.

Gate: npm run check, sem skip/remoção. Casos novos: 8. Log: output/finance-local/t7-gate.log.

## T8

FinancePort real e nove rotas (oito v1 mais emissao de sessao demo): schemas/envelopes, 401/403/422/409/503, CSRF Origin, cookie assinado, SDK, overflow e unicidade SQL. Testes: session.test.ts, tests/integration/finance/http.test.ts e tests/e2e/finance.spec.ts. E2E consome Next compilado e SQL real por ponte HTTP local, liquida/reserva e reinicia servidor preservando dados; datas relativas evitam dependencia do calendario. Aceitacao F1 em datas exatas permanece nos unitarios e integracao. Gate final: 35 unitarios, 51 integracao, 4 E2E, lint/tipos/build. Contratos e dependencias compartilhadas intactos.

Gate: npm run check, sem skip/remoção. Casos novos: 18. Log: output/finance-local/t8-gate.log.

## Verificação independente — PASS

Verifier `verify_finance`, após os sete commits de implementação, revisou T2–T8 e reexecutou 35/35 unitários e 51/51 testes de integração. Não encontrou achados materiais. Log independente: `output/finance-local/verifier-integration.log`. O gate completo também comprovou 4/4 E2E, lint, tipos e build. Os arquivos de fonte originais permaneceram intactos na verificação.

| Critérios financeiros exercitados | Evidência principal |
| --- | --- |
| HOST-04/DATA-04/SAFE-05, parte financeira T2 | persistence.test.ts: recarga, CAS, histórico, empresa demo, RLS/RPC e loopback; HTTP/E2E identificam user_data e reiniciam servidor |
| DATA-01/02/03, T3/T8 | import.test.ts + http.test.ts: prévia persistida, confirmação integral, 422 por linha/campo, limites, conflito, retry, concorrência e overflow sem escrita |
| CASH-01/02 e SAFE-04, parte financeira T4/T8 | cash.test.ts: centavos exatos F1, abertura, realizados, 30 dias, zero/incerto, reserva e overflow; agente real ainda pertence a Bruno |
| CASH-05/06 e SAFE-02, T5 | transactions.test.ts: vencimento preservado, versão, CAS concorrente, final imutável, liquidação única e rollback de gancho |
| CASH-03/04, T6/T8 | scenarios.test.ts + http.test.ts: -50000 de 27 a 31/10, 150000 em 01/11, base preservada, atraso fora da janela e stale rejeitado |
| RES-01/02/03/04, T7/T8 | reservations.test.ts: F2, reconfirmação, pagamento/liberação, excesso disponível, unicidade/concorrência; saldo e curva sem dupla subtração |
| SAFE-01/05, parte financeira T8 | session.test.ts + http.test.ts + E2E: cookie assinado/expirado, empresa, Origin, schemas/envelopes, 401/403/409/422/503, sem vazamento de segredo |

Sensor de discriminação executado pelo Verifier em `C:/Users/danie/AppData/Local/Temp/finance-verifier-2fc5e72`, cópia `git archive` com junction de dependências; nenhuma mutação na árvore de trabalho:

| Falha deliberada | Teste que discriminou | Resultado |
| --- | --- | --- |
| Subtrair reserva outra vez na projeção | cash.test.ts:43; recebeu -60000, exigiu -50000 | KILLED; sensor-reserve.log |
| Remover checagem de base_version do cenário | scenarios.test.ts:30; versão antiga deixou de lançar conflito | KILLED; sensor-stale.log |

2/2 falhas detectadas, zero sobreviventes. CASH-06, RES-02, RES-04 e SAFE-02 podem ser Verified pois todas as suas tarefas mapeadas (T5, T7 ou T2/T5) e respectivos gates estão concluídos. Demais requisitos com dependências de outras frentes permanecem In Progress/Pending.

Limites: `finance_resolutions` é o ponto transacional disponível para Bruno anexar encerramento de tarefas em 002_tasks.sql; a integração real desse trigger é T21. Jecky ainda compõe a UI e inicia a sessão demo. T21/T22, agente, voz, cron e validação de Supabase remoto não foram declarados concluídos. Nenhuma publicação ou escrita remota ocorreu. README financeiro contém as instruções dos adaptadores e do banco local.

## Revisão pré-push autorizado — 2026-10-23

Revisão do diff completo, contratos, escopo, persistência, validação, sessão e integridade. A revisão identificou uma linha CSV final com apenas uma célula vazia entre aspas (`""`) que podia ser descartada pelo parser. A condição de fechamento agora conserva esse registro para a validação rejeitar a linha incompleta. O novo teste de regressão em `tests/integration/finance/import.test.ts` exige erro na linha 4, confirmação 422 e zero movimentações persistidas.

Após a correção, `npm run check` passou novamente: **35 unitários, 52 integração e 4 E2E**, lint, tipos e build verdes. Log local: `output/finance-local/pre-push-gate.log`. `git diff --check` passou; contratos, dependências e áreas dos colegas continuam intactos. Não há `.env`, credenciais reais ou banco local versionados. O fetch confirmou que a branch remota não tinha commits ausentes no clone.

O usuário autorizou explicitamente o push da branch `feat/daniel-caixa-dados` para `origin`, após esta revisão. A correção recebe um commit adicional aos sete commits das tarefas. Deploy, provisionamento e migração remota continuam fora da autorização.
