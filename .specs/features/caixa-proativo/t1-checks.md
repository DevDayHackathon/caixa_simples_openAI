# Verificação T1 — base comum

Data: 2026-10-23. Escopo: somente T1. Resultado: PASS para os critérios da base. Autor/verificação por tarefa: agente principal, implementação não delegada conforme escolha do usuário. Não é o relatório independente de validação da feature completa; T2–T22 continuam pendentes.

## Gate e contagem

`npm run check` passou: ESLint, Next typegen/TypeScript, 15 testes unitários, 6 testes de integração cliente/mock e 3 E2E Chromium. Zero testes ignorados/removidos. Build de produção executado dentro do E2E. Suite anterior inexistente; total novo: 24 casos.

Foi necessário executar build/navegador com permissão de subprocessos e servidor local do ambiente. Não foi feito deploy, conexão bancária, chamada OpenAI, migração ou cron remoto. Avisos FORCE_COLOR/NO_COLOR vieram do ambiente do executor e não representam erros de aplicação.

## Cobertura dos critérios de T1

| Critério da tarefa | Evidência e asserção | Resultado |
| --- | --- | --- |
| F1 materializada com centavos e datas do enunciado | `src/contracts/schemas.test.ts:10` — `expect(...opening_balance_cents).toBe(100000)`; linhas 12–15 com valores 200000/150000 e datas | PASS |
| Schema rejeita campos financeiros inválidos | `src/contracts/schemas.test.ts:19` e `:23` — `safeParse(...).success` deve ser false para zero, negativo, fração, overflow e datas inválidas | PASS |
| Conta realizada exige data | `src/contracts/schemas.test.ts:27` — ausência de settled_date é rejeitada | PASS |
| Payload não aceita campo extra | `src/contracts/schemas.test.ts:31` — campo api_key provoca rejeição | PASS |
| F2 independente disponível | `src/contracts/schemas.test.ts:35`–`:37` — saldo 100000, fornecedor 50000, reservas vazias | PASS |
| Snapshot de referência contém trinta dias e valores F1 | `src/contracts/schemas.test.ts:42`–`:49` — 30 dias, saldo 100000, entradas/saídas realizadas zero, 300000/150000 nas datas e fonte mock | PASS como fixture, não cálculo real |
| Contrato de tarefa inclui horário UTC e motivo | `src/contracts/schemas.test.ts:54`–`:60` — due_at 18h UTC, São Paulo, 1440 min, origem agent e justificativa; rejeita motivo vazio/horário sem timezone | PASS estrutural; decisão/persistência em T12 |
| Fluxos user/task não se confundem | `src/contracts/schemas.test.ts:65`–`:67` — input do usuário rejeita origin task e mais de 4000 caracteres | PASS estrutural |
| Envelopes tipados | `src/contracts/schemas.test.ts:71`–`:73` — versão e código corretos; erro incompleto rejeitado | PASS |
| Cliente e handler usam o mesmo formato | `tests/integration/clients.test.ts:12` — resultado igual ao snapshot completo; `:13` identifica mock | PASS |
| Agente e notificações mock respeitam clientes | `tests/integration/clients.test.ts:23`–`:24` — payloads completos iguais às fixtures | PASS |
| Erros e payload inválido não viram saldo | `tests/integration/clients.test.ts:29` — rejeição; `:34` — status 409, code, request_id e campos preservados | PASS |
| Mocks isolados por consumidor | `tests/integration/clients.test.ts:43` — editar o primeiro retorno não altera o segundo | PASS |
| Escrita não finge sucesso | `tests/integration/clients.test.ts:48` — confirmImport rejeita com MockOperationUnavailable | PASS |
| Página abre sem credenciais e sinaliza limites | `tests/e2e/base.spec.ts:5`–`:10` — título, marca de dados simulados, R$ 1.000, ausência de banco/IA e resposta expansível visíveis | PASS |
| Endpoint readonly fictício | `tests/e2e/base.spec.ts:15`–`:22` — 200, no-store, fonte mock, saldo 100000, 30 dias e request_id | PASS |
| Layout estreito | `tests/e2e/base.spec.ts:29` — scrollWidth <= viewport de 360 px | PASS |
| Configuração de hosting e segredos | `vercel.json:1`, `src/app/api/demo/snapshot/route.ts:4`–`:6`, `.env.example:1` | Configuração revisada: sem cron Vercel, runtime Node, limite 60 s e exemplo sem valores |

## Mapeamento reverso

| Testes | Origem da exigência | Manter |
| --- | --- | --- |
| Unitários de F1/F2/snapshot | T1 fixtures + CASH-01/02 e RES-01 como oráculos futuros | Sim |
| Unitários de datas, centavos, liquidação e campos extras | T1 schemas + DATA-02 e regras de contrato | Sim |
| Unitário de horário/motivo | T1 contrato ScheduledTask + TASK-07 | Sim |
| Unitários de input/envelope | T1 contratos + AGENT-01/SAFE-01 | Sim |
| Integração handler/cliente/agente/notificações | T1 adaptadores e mocks interoperáveis | Sim |
| Integração de payload/erro/isolamento/mutação não disponível | T1 não mascarar implementação futura | Sim |
| E2E página, endpoint e tela estreita | T1 página mínima acessível sem credenciais | Sim |

Os critérios completos DATA-01, CASH-01, AGENT-01, TASK-01, TASK-07 e HOST-01 não foram marcados Verified: suas partes de produto dependem de tarefas futuras. T1 fecha somente a base que permitirá implementá-los. Guia `docs/base-comum.md` explicita limitações dos mocks.

## Sensibilidade dos testes

Duas falhas foram injetadas em cópias temporárias de src/tests/configs, com node_modules compartilhado apenas para leitura. Nenhum arquivo da árvore real foi alterado. Git porcelain e hashes de src/tests foram comparados antes/depois.

| Falha deliberada | Evidência que a detecta | Resultado |
| --- | --- | --- |
| positiveCents aceita zero | unitário `schemas.test.ts:19` | KILLED por AssertionError |
| Cliente deixa de validar payload financeiro | integração `clients.test.ts:29` | KILLED por AssertionError |

2/2 detectadas; zero sobreviventes; isolamento confirmado. Sensor executado pelo autor como reforço do gate de T1, não apresentado como verificação independente de toda a feature.

## Pendências explícitas

Sem aplicação financeira real, banco persistido, algoritmo de projeção, importador, agente, voz, reservas, tarefas ou cron. SDKs instalados, não utilizados. Branches da equipe, push e deploy não executados. A verificação independente da feature ocorre após suas tarefas restantes, conforme a skill.
