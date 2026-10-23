# Entregas

Quatro tarefas locais, executadas na ordem. Gate completo: `npm run check` com Postgres local e `PSQL_PATH` configurados. Commit por entrega, seguido de verificador independente ao concluir.

- [x] I1 Infraestrutura reproduzível: fallback psql multiplataforma, instruções e workflow CI com Postgres; provar gate existente. Tests: integration/e2e. Gate: full.
- [x] I2 Leitura agregada autenticada: snapshot, compromissos e business da mesma leitura, com sessão/origem/erros existentes; testes de 200/401/422/503 e consistência. Tests: integration. Gate: full.
- [x] I3 Área `/caixa`: adaptadores injetáveis, sessão, atualização consistente, limpeza de hipótese, ações manuais confirmadas e erros recuperáveis; E2E com CSV, previsão, criação, reserva, liquidação e recarga. Tests: unit/e2e. Gate: full.
- [x] I4 Preparação de integração: estados honestos do agente/voz, documentação de ativação e limites, revisão independente com sensor. Tests: unit/e2e. Gate: full.

I1: npm run check PASS: 99 unitários, 52 integração SQL, 7 E2E; lint/tipos/build. Workflow preparado, execução hospedada somente após push. INT-05: guarda loopback em persistence.test.ts; suíte financeira completa prova escritas/recarga sem mocks de banco.

I2: gate completo PASS (99 unitários, 56 integração, 7 E2E). INT-01: workspace.test.ts:21 snapshot versão2/saldo100000, :20 compromissos e business exatos. INT-04: :24 401/422 e :33 503 sem segredo; INT-01 horizonte fixo :28. Todas as quatro asserções rastreiam INT-01/04, sem testes removidos/skips.

## Test Coverage Matrix
| Entrega | Critérios | Camadas |
| --- | --- | --- |
| I1 | INT-05 | SQL real e E2E |
| I2 | INT-01, INT-04 | HTTP e SQL real |
| I3 | INT-01, INT-02, INT-03, INT-04 | UI e E2E SQL |
| I4 | INT-06 | UI, documentação e sensor independente |

## Gate Check Commands
Full: `npm run check` (lint, tipos, unitários, integração e E2E com build).

## Execution Plan
I1 → I2 → I3 → I4. Quatro entregas desta extensão; o plano original do MVP permanece separado, sem marcar T21/T22 concluídas.

## Task Breakdown
As quatro entregas I1–I4 são definidas acima e correspondem somente a esta extensão.


### T1: Infraestrutura reproduzível (I1)
**What**: Entregar I1 com os critérios INT-05 acima.
**Where**: tests/integration/finance/database.ts, .github/workflows/check.yml
**Depends on**: None
**Requirement**: INT-05
**Tests**: integration, e2e
**Gate**: full
**Done when**: Os resultados I1 passam no gate completo, com evidência e commit local.

### T2: Leitura agregada (I2)
**What**: Entregar I2 com os critérios INT-01, INT-04 acima.
**Where**: src/features/finance/http.ts, src/app/api/finance/workspace/route.ts
**Depends on**: T1
**Requirement**: INT-01, INT-04
**Tests**: integration, e2e
**Gate**: full
**Done when**: Os resultados I2 passam no gate completo, com evidência e commit local.

### T3: Área persistida e ações manuais (I3)
**What**: Entregar I3 com os critérios INT-01, INT-02, INT-03, INT-04 acima.
**Where**: src/features/experience/, src/app/caixa/page.tsx
**Depends on**: T2
**Requirement**: INT-01, INT-02, INT-03, INT-04
**Tests**: integration, e2e
**Gate**: full
**Done when**: Os resultados I3 passam no gate completo, com evidência e commit local.

### T4: Preparação e verificação (I4)
**What**: Entregar I4 com os critérios INT-06 acima.
**Where**: docs/integracao-financeira.md, .specs/features/integracao-financeira/validation.md
**Depends on**: T3
**Requirement**: INT-06
**Tests**: integration, e2e
**Gate**: full
**Done when**: Os resultados I4 passam no gate completo, com evidência e commit local.


## Evidência I3 e adequação
Gate completo PASS: 99 unitários, 56 integração SQL e 10 E2E; lint/tipos/build. Nenhum teste anterior removido, enfraquecido ou ignorado.

| Critério | Evidência e asserção | Resultado |
| --- | --- | --- |
| INT-01/02 importação atualiza painel | tests/e2e/finance.spec.ts:84 `toHaveText(/1\.000,00/)` após confirmar CSV | Saldo100000, PASS |
| INT-02 simular e alterar limpa hipótese e persiste previsão | tests/e2e/finance.spec.ts:88 `toHaveText(/-R\$\s*500,00/)`, :90 `toHaveCount(0)`, :120 expected_date=delayed | PASS |
| INT-03 criação exige confirmação | tests/e2e/finance.spec.ts:97 `toBeDisabled()` antes do checkbox; :120 objeto persistido com valor50000/direção out/data e fornecedor exatos | PASS |
| INT-03 reserva/liquidação | tests/e2e/finance.spec.ts:108 `toMatchObject({transaction_id:id,amount_cents:50000,status:'active'})`; :120 settled/released | PASS |
| INT-03 recarga | tests/e2e/finance.spec.ts:114 `toHaveText(/500,00/)` e :115 reserva zero | PASS |
| INT-04 falha de banco | tests/e2e/finance.spec.ts:124 `toContainText('Banco indisponível.')`, :125 `toHaveCount(0)`, :126 `toBeEnabled()` | PASS |
| INT-04 conflito não altera estado | tests/e2e/finance.spec.ts:141 mensagem exata, :142 nenhum sucesso, :143 data original, :144 saldo base | PASS |
| INT-06 agente/voz ausentes | tests/e2e/finance.spec.ts:75 exemplo ausente e :118 gravar ausente; rotas de áudio continuam 503 pelos testes anteriores | PASS |
| Responsividade | tests/e2e/finance.spec.ts:117 `scrollWidth<=innerWidth` em360px | PASS |

Mapeamento reverso: os três testes novos E2E correspondem INT-01/02/03/04/06; workspace.test.ts corresponde INT-01/04. Cada asserção nova cobre um resultado acima, sem testes especulativos. O caso de layout preserva a exigência de360px da experiência existente. Captura output/playwright/persisted-cash-mobile.png inspecionada; checkbox e cabeçalho ajustados, gate reexecutado. Regras seguidas: AGENTS.md fornecido, Karpathy e TLC.

I4: composição e limites documentados em docs/integracao-financeira.md. Estados indisponíveis de agente/voz validados pelos E2E de I3 e testes de handlers existentes. Gate completo herdado sem alterações de código posteriores; revisão independente é o fechamento obrigatório a seguir. T21/T22 do MVP continuam pendentes.
