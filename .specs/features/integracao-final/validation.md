# Integração final — validação independente

Date: 2026-10-23. Verifier: agente independente, autor ≠ verificador.
Diff range revisado: origin/main..909085f. Rodada1 revisou49763ac; rodada2 confirmou as correções909085f.

**Verdict: PASS — prontidão local para publicação e merge.** FINAL-05 remoto continua pendente até confirmação pelo responsável da publicação. Gate completo independente concluído na rodada2.

## Gaps da rodada1 resolvidos

1. FINAL-03: propostas automáticas `simulate` usam alvo `demo` e não têm `expected_date` (`src/features/agent/proactivity.ts:14`), mas o aceite procura uma transação pendente e data concreta (`src/features/agent/actions.ts:34`). O botão Aceitar falha para o alerta automático de saldo negativo. RESOLVIDO: actions.save filtra propostas automáticas sem alvo/data concretos. `tests/integration/agent-actions.test.ts:68` exige zero propostas inválidas; :69 mantém risco financeiro -50000 visível no snapshot; :71 aceita simulação concreta, status accepted e versão3 sem escrita financeira.
2. FINAL-01: testes adicionais do autor para execução SQL/concorrência ainda não passam; primeiro gate observou erro no helper que coloca função set-returning dentro de COALESCE. RESOLVIDO: gateway usa FROM para SRF. `tests/integration/tasks-sql-runtime.test.ts:24` exige claimed1/completed1/notified1; :25 repetição claimed0/notified0; :31 cancela running e suprime aviso; :38 owner antigo é rejeitado; :41 owner novo conclui. RPC bloqueia finance→task e valida tentativa/lease antes de notificar; encerramento cerca tentativa/lease.
3. FINAL-05: push/merge e CI remoto devem ser confirmados pelo responsável da publicação. Prontidão local não comprova incorporação à main. APIs reais e cron/Vault/pg_net remoto permanecem pendentes por ausência de configuração.

## Evidências por requisito

| Requisito | Evidência e asserção | Estado |
| --- | --- | --- |
| FINAL-01 | `tests/integration/agent-sql.test.ts:11` quota `toBe('t\nf')`; :16 histórico `toHaveLength(20)` e primeira entrada `2`; :24 resolução cancela tarefa | PASS incluindo runtime SQL real |
| FINAL-02 | `tests/integration/agent-composition.test.ts:23` sessão financeira assinada; :31 snapshot fonte persistida/version7; :38 banco ausente produção lança; `tests/integration/agent-routes.test.ts:31` Origin403 | PASS |
| FINAL-03 | `tests/integration/agent-actions.test.ts:26` zero reserva antes aceite; :28 uma reserva50000/version3; :29 replay sem duplicação; :38 sessão estrangeira rejeitada; :40 stale rejeitado; :45 recibo accepted; :59 leitura persistida e :60 cancelamento | PASS após regressão rodada2 |
| FINAL-04 | `tests/integration/audio-live.test.ts:16` transcrição200 e quota; :20 MP3; :21 erro503 sanitizado; :26 quota429 sem provedor; `tests/e2e/agent-integrated.spec.ts:41` zero reserva antes do aceite, :43 reserva50000 SQL | PASS, E2E independente incluído no gate final |
| FINAL-05 | `.specs/features/integracao-final/tasks.md` T6 corretamente aberto | Pendente publicação |

## Sensor comportamental isolado

Cópia de `git archive HEAD` em `/tmp/integracao-final-sensor`, dependências somente linkadas. Nenhuma mutação foi aplicada ao checkout real; nenhum stash utilizado. Baseline real antes: ` D fluxo_agente_proativo.png` e `?? AGENTS.md`. Alterações adicionais no checkout durante o sensor pertencem ao autor, que trabalha simultaneamente; não foram feitas pelo verificador.

| Mutação | Alvo | Resultado observado |
| --- | --- | --- |
| Origin sempre permitido | session.ts `isSameOrigin` | KILLED: esperado403, recebido503 |
| Ignorar assinatura HMAC | session.ts comparação segura | KILLED: esperado401, recebido200 |
| Remover rejeição stale na aplicação | actions.ts decisão | KILLED: rejeição amigável esperada vira erro SQL CONFLICT |
| Remover efeito da reserva | actions.ts decisão | KILLED: resultado sem proposta accepted; caso antes verificava SQL/reserva |
| Quota SQL sempre true | 002_tasks.sql | KILLED: esperado t/f, recebido t/t |
| Histórico SQL retém19 entradas | 002_tasks.sql | KILLED: esperado20, recebido19 |

Rodada2 adicionou duas mutações: remover filtro de propostas automáticas, morta por `agent-actions.test.ts:68` (esperado[], recebeu proposta inválida); remover fencing de attempt/lease no SQL, morta por `tasks-sql-runtime.test.ts:38` (promise resolveu em vez de rejeitar). Total:8 mutações,8 mortas,0 sobreviventes. Primeira tentativa sob sandbox sem loopback foi descartada; rodada válida executada com acesso autorizado ao Postgres17 local. Logs `/tmp/final-sensor-{origin,signature,stale,reserve,quota,history}.log`.

## Gate independente

`npm run check` sobre909085f: lint/tipos PASS;135 unitários PASS;99 integração PASS;11 E2E PASS;0 falhas e0 skips. O E2E inclui build Next de produção e fluxo navegador→agente local de teste→SQL→recarga. Contagem antes da revisão:135/95/11; quatro integrações adicionais, nenhum teste removido. Logs `/tmp/final-verifier-r2-gate.log`. A rodada1 parou com3 falhas no helper novo; todas resolvidas antes do gate final.

## Limites e qualidade

Mudanças dentro do escopo autorizado; dados fictícios/demo compartilhada, nenhuma chave real, nenhuma chamada paga, deploy ou migração remota. UAT com OpenAI/Supabase reais deve ser conduzido após configuração pelo usuário. Documentação atualizada pelo autor em `docs/integracao-financeira.md`, `.env.example` e roteiro UAT foi relida e corresponde à composição final. Alterações de código são cirúrgicas e rastreáveis aFINAL01–04; propostas/efeitos financeiros e fronteiras HTTP têm evidência positiva e negativa. As lições L001/L002 registram os dois sinais da rodada1. T1–T4 concluídos; T5 pronto para etapa remota, ainda sem declarar merge concluído.
