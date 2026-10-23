# Validação da integração financeira

**Verdict: PASS** para a extensão local INT-01–06. Agente, implantação e quota de áudio permanecem fora desta entrega.

**Data:** 2026-10-23. **Spec:** `.specs/features/integracao-financeira/spec.md`.
**Diff:** `1e3b9c7..5571bff`, branch `codex/integracao-financeira`.
**Verifier:** subagente independente, não autor da implementação.

## Tarefas e resultados ancorados na spec

I1–I4 estão marcadas concluídas em tasks.md. Esta revisão fecha a verificação independente de I4. Os requisitos ainda constavam In Progress na rastreabilidade; o autor deve registrar o fechamento após este relatório.

| Critério | Resultado esperado e evidência independente | Resultado |
| --- | --- | --- |
| INT-01 | Sessão demo emitida e dados da mesma leitura. `tests/integration/finance/http.test.ts:26` verifica 200 e cookie HttpOnly; `tests/integration/finance/workspace.test.ts:18` usa `toEqual(f1.business)` e `toEqual(f1.transactions)`, :19 exige versão 2, saldo 100000, source user_data e as_of 2026-10-23. `src/features/finance/http.ts:52` lê estado uma única vez, :56 calcula snapshot desse estado. `tests/e2e/finance.spec.ts:73` exige saldo inicial zero na abertura sem sessão prévia do navegador. | PASS |
| INT-02 | CSV e previsão recarregam o financeiro e removem hipótese antiga. `tests/e2e/finance.spec.ts:84` exige saldo 1.000,00 após confirmar CSV; :88 exige mínimo -500,00 na simulação; :90 `toHaveCount(0)` para hipótese e :91 conserva mínimo -500,00 persistido; :120 exige expected_date alterada no SQL. `src/features/experience/persisted-cash.tsx:22` desmonta durante recarga e reinicia pela versão. | PASS |
| INT-03 | Ações manuais confirmadas persistem e sobrevivem recarga. `tests/e2e/finance.spec.ts:97` exige criação desabilitada sem confirmação; :98/104/110 confirmam cada ação; :108 exige reserva ativa de 50000 para o ID escolhido; :112/114 exige saldo 500,00 antes/depois da recarga; :120 exige saída liquidada de 50000 com fornecedor, descrição, datas exatas e reserva released. `src/features/experience/manual-finance.tsx:12` também impede qualquer operação sem confirmação; :29–39 retiram confirmação ao editar. | PASS |
| INT-04 | Erros recuperáveis sem mocks, sucesso falso ou repetição automática. `tests/integration/finance/workspace.test.ts:22` exige 401 sem sessão; `tests/integration/finance/http.test.ts:27` inclui cookie expirado e :29 exige 401. Workspace :23 exige 422 nas consultas inválidas e :32 exige 503 sem segredo. `tests/e2e/finance.spec.ts:124–126` verifica mensagem, painel ausente e botão de recuperação habilitado; :141–144 verifica conflito explícito, ausência de sucesso e data/saldo originais. Inspeção: `manual-finance.tsx:24` só registra erro; `persisted-cash.tsx:25–31` renova sessão apenas na leitura e não repete escrita. | PASS |
| INT-05 | Gate completo sem skips e Postgres isolado loopback. `tests/integration/finance/persistence.test.ts:32` exige rejeição de URL remota; `tests/integration/finance/database.ts:26` gera banco aleatório por teste e :45 encerra-o. `.github/workflows/check.yml:36` chama o mesmo gate com Postgres17, Node24 e Chromium configurados. Execução independente efetiva descrita abaixo. | PASS local; CI hospedada não executada |
| INT-06 | Conversa/voz indisponíveis, composição documentada e nenhuma chamada paga habilitada. `tests/e2e/finance.spec.ts:75` exige exemplo ausente; :118 exige botão de gravação ausente. `src/features/experience/audio-handlers.test.ts:16` exige 503/AUDIO_UNAVAILABLE nas duas rotas. `docs/integracao-financeira.md:46–53` define sessão, origem, quota compartilhada e provedor antes da ativação; `folego-dashboard.tsx:451` explica a indisponibilidade. | PASS |

Os critérios definem estados observáveis suficientes para esta extensão. Não foram detectadas lacunas de precisão que impeçam determinar esses resultados. Mensagens e valores numéricos acima derivam dos dados do cenário de teste e dos contratos financeiros existentes.

## Gate independente

Comando: `npm run check`, usando Postgres17 em 127.0.0.1:55432, usuário postgres, executado com permissão de processos/sockets locais.

- Lint, geração de tipos e TypeScript: PASS.
- Unitários: **99/99**; integração SQL: **56/56**; E2E Chromium com build de produção: **10/10**.
- Total: **165 passaram, zero falhas, zero skips**. Comando terminou com código 0.
- Base documentada e corroborada pelo diff: 99 unitários, 52 integração e 7 E2E. Delta: +4 integração, +3 E2E; testes existentes não foram removidos, enfraquecidos nem desabilitados.
- Log: `/tmp/finance-verifier-gate.log` (temporário, não versionado).

## Sensor de discriminação

Profundidade leve, proporcional à nova composição e leitura agregada. Banco continua real e isolado. Cada mutação foi aplicada somente à cópia de `git archive HEAD` em `/tmp/finance-verifier-scratch`; `node_modules` compartilhado por symlink apenas para leitura. Não foi usado stash.

| Mutação | Evidência | Resultado |
| --- | --- | --- |
| Endpoint `src/features/finance/http.ts:57`: responder 201 no workspace em vez de 200 | `vitest run --config vitest.integration.config.ts tests/integration/finance/workspace.test.ts`: 1 falha/3 passam. `workspace.test.ts:17` detectou exatamente expected 200/received 201. Log `/tmp/finance-verifier-endpoint-mutant.log`. | Morta |
| UI `src/features/experience/folego-dashboard.tsx:94`: remover `onFinancialAction?.()` após mutação | `playwright test tests/e2e/finance.spec.ts --grep 'browser persists'`, em porta scratch 3101. 1 falha esperada em `tests/e2e/finance.spec.ts:84`: saldo permaneceu R$ 0,00 em vez de 1.000,00 após confirmar importação. Log `/tmp/finance-verifier-ui-mutant.log`. | Morta |

## Qualidade e limites

Revisados todos os 17 arquivos do diff. Alterações estão limitadas a infraestrutura local/CI, leitura agregada, composição persistida, ações manuais, estilos necessários, documentação e testes correspondentes. Sem abstrações especulativas ou alteração de contratos/migrações do agente. Seguem AGENTS.md, Karpathy e princípios de código da skill TLC.

Cobertura nova: os quatro testes workspace cobrem consistência, consultas inválidas, janela temporal e falha sanitizada; os três E2E novos cobrem jornada persistida, erro de dependência e conflito. O teste longo de jornada usa valores financeiros e consulta SQL, sem se limitar a presença de elementos. A organização compacta dos componentes novos reduz a legibilidade, mas não foi encontrada falha material ou escopo adicional que bloqueie a entrega.

A recuperação de sessão e ausência de repetição são sustentadas pela composição e pelos testes de autorização/erros; não houve ensaio humano de expiração durante uma sessão interativa. Nenhuma UAT humana, Supabase remoto, deploy ou CI hospedada foi executada. E2E usa a ponte RPC local com Postgres real. Datas além do horizonte permanecem limitadas conforme a spec. T21/T22 integrais, Bruno, cron e chamadas pagas continuam pendentes.

Nenhum gap fundamentado, mutante sobrevivente ou SPEC_DEVIATION foi encontrado; portanto não se registra lição artificial. Fechamento de rastreabilidade fica com o autor após receber esta revisão.

**Sensor: PASS, 2/2 mutações mortas, zero sobreviventes.** Scratch descartado. `git status --porcelain` antes e depois foi idêntico: exclusão preexistente de fluxo_agente_proativo.png e AGENTS.md não rastreado. Nenhuma mutação de código/testes reais. Só este relatório foi acrescentado após comparar isolamento.
