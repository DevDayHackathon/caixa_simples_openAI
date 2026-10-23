# Caixa proativo — Tasks

**Status**: In Progress; T1 concluída e verificada. T2–T22 pendentes; branches ainda não criadas.

## Execution Protocol

Usar a skill `tlc-spec-driven` e Karpathy na implementação. Cada tarefa inclui seus testes e um commit atômico Conventional Commits. Atualizar tarefa e rastreabilidade antes do commit. Não marcar Verified sem gate. Após a última tarefa, Verifier independente com evidência por critério e sensor de discriminação, conforme a skill. Não há validation.md porque o produto ainda não foi implementado.

O pedido do usuário autoriza três pessoas trabalhando em paralelo. Isso prevalece sobre a execução sequencial padrão da skill: cada pessoa segue sua cadeia em ordem; cadeias independentes podem avançar juntas. Nenhum subagente de implementação foi solicitado ou iniciado.

## Test Coverage Matrix

Gerada inicialmente sem aplicação. T1 agora materializa package.json, Vitest e Playwright; manter os defaults fortes para as próximas camadas. Integração T1 testa clientes/mocks; persistência real pertence às tarefas seguintes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Cálculo e regras | unit | Todo AC e borda pertinente; valores exatos F1/F2 | src/**/*.test.ts | npm run test:unit |
| Componentes | unit | Estados, ações e erros definidos na spec | src/**/*.test.tsx | npm run test:unit |
| Banco, APIs e executor | integration | Caminho feliz, erro, concorrência e idempotência | tests/integration/ | npm run test:integration |
| Jornadas e cron | e2e | Ambos os fluxos, dados persistidos e cliente desconectado | tests/e2e/ | npm run test:e2e |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefas unitárias | npm run test:unit |
| Full | Persistência, rotas e composição | npm run test:unit && npm run test:integration && npm run test:e2e |
| Build | Fechamento | npm run check |

Scripts materializados e validados em package.json pela T1. test:e2e compila produção antes de iniciar seu servidor; check inclui lint, tipos, testes e esse build. Full roda os testes existentes das camadas indicadas; testes não podem ser removidos/ignorados para obter verde. Contagens abaixo são mínimos novos por tarefa, e não totais da suíte. Infraestrutura isolada é obrigatória para testes de escrita.

## Execution Plan

### Phase 1: Base compartilhada

T1 concluída na main; a criação das branches ainda não foi executada.

### Phase 2: Três cadeias paralelas

Daniel: T2–T8. Bruno: T9–T14. Jecky: T15–T20. Dependências abaixo são funcionais, não a ordem numérica global. Mocks permitem Bruno e Jecky começarem após T1.

### Phase 3: Integração

T21 e T22 depois da integração das três cadeias; o restante da entrega remota precisa de autorização específica.

## Phase Execution Map

```text
T1 -> T2
T2 -> T3
T1 -> T4
T2 -> T5
T4 -> T6
T4 -> T7
T5 -> T7
T3 -> T8
T5 -> T8
T6 -> T8
T7 -> T8
T1 -> T9
T9 -> T10
T9 -> T11
T1 -> T12
T11 -> T13
T12 -> T13
T10 -> T14
T13 -> T14
T1 -> T15
T1 -> T16
T1 -> T17
T1 -> T18
T18 -> T19
T1 -> T20
T8 -> T21
T14 -> T21
T15 -> T21
T16 -> T21
T17 -> T21
T18 -> T21
T19 -> T21
T20 -> T21
T21 -> T22
```

## Task Breakdown

### Phase 1: Base comum

### T1: Base comum e contratos executáveis

**Owner**: Implementada pelo agente principal a pedido do usuário; Daniel segue responsável por T2–T8.
**What**: Incorporar a configuração Vercel Hobby/Supabase Free do guia, sem provisionamento, e Fixar stack, lockfile, schemas v1, fixtures F1/F2, mocks e scripts de gates; rejeitar schema inválido e provar mocks compatíveis.
**Where**: `package.json`
**Depends on**: None
**Requirement**: TASK-07, HOST-01, DATA-01, CASH-01, AGENT-01, TASK-01
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [x] Base técnica e partes estruturais dos critérios vinculados verificadas; os critérios completos de produto continuam pendentes nas tarefas seguintes.
- [x] Pelo menos 3 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [x] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(base): prepare shared contracts and development scaffold`

**Evidence**: `t1-checks.md`; gate npm run check: 15 unitários, 6 integração e 3 E2E passaram; tipos, lint e build verdes.

### Phase 2: Desenvolvimento paralelo

### T2: Persistência financeira

**Owner**: Daniel
**What**: Persistir a empresa demo e compromissos versionados; recarga preserva dados e escrita fora do escopo é rejeitada.
**Where**: `supabase/migrations/001_finance.sql`
**Depends on**: T1
**Requirement**: HOST-04, DATA-04, SAFE-02, SAFE-05
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [x] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [x] Pelo menos 5 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [x] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(caixa): persistência financeira`

**Evidence**: `daniel-checks.md` — T2; gate verde; 6 casos novos.

### T3: Importador CSV atômico

**Owner**: Daniel
**What**: Prévia e confirmação aceitam F1; inválido, excesso de limite, duplicata e retry não deixam escrita parcial.
**Where**: `src/features/finance/import.ts`
**Depends on**: T2
**Requirement**: DATA-01, DATA-02, DATA-03
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [x] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [x] Pelo menos 8 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [x] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(caixa): importador csv atômico`

**Evidence**: `daniel-checks.md` — T3; gate verde; 10 casos novos.

### T4: Cálculo do caixa diário

**Owner**: Daniel
**What**: F1 retorna 100000 hoje, 300000 no recebimento e 150000 após fornecedor; vazio, saldo zero e incerto seguem a spec.
**Where**: `src/features/finance/cash.ts`
**Depends on**: T1
**Requirement**: CASH-01, CASH-02, SAFE-04
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [x] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [x] Pelo menos 8 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [x] Gate quick da tabela passa com evidência registrada; dependências concluídas.
**Tests**: unit
**Gate**: quick
**Commit**: `feat(caixa): cálculo do caixa diário`

**Evidence**: `daniel-checks.md` — T4; gate verde; 10 casos novos.

### T5: Atualização e liquidação de compromissos

**Owner**: Daniel
**What**: Alteração preserva vencimento; liquidação não duplica valor; versão antiga e transição final inválida retornam conflito.
**Where**: `src/features/finance/transactions.ts`
**Depends on**: T2
**Requirement**: CASH-05, CASH-06, SAFE-02
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [x] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [x] Pelo menos 6 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [x] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(caixa): atualização e liquidação de compromissos`

**Evidence**: `daniel-checks.md` — T5; gate verde; 8 casos novos.

### T6: Simulador isolado

**Owner**: Daniel
**What**: Atraso F1 retorna -50000 de 27/10 a 31/10, recupera em 01/11 e preserva a base.
**Where**: `src/features/finance/scenarios.ts`
**Depends on**: T4
**Requirement**: CASH-03, CASH-04
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [x] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [x] Pelo menos 5 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [x] Gate quick da tabela passa com evidência registrada; dependências concluídas.
**Tests**: unit
**Gate**: quick
**Commit**: `feat(caixa): simulador isolado`

**Evidence**: `daniel-checks.md` — T6; gate verde; 6 casos novos.

### T7: Reservas virtuais

**Owner**: Daniel
**What**: F2 reserva 50000, não duplica, rejeita excesso e libera ao pagar sem dupla subtração.
**Where**: `src/features/finance/reservations.ts`
**Depends on**: T4, T5
**Requirement**: RES-01, RES-02, RES-03, RES-04
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [x] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [x] Pelo menos 6 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [x] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(caixa): reservas virtuais`

**Evidence**: `daniel-checks.md` — T7; gate verde; 8 casos novos.

### T8: Adaptador HTTP financeiro

**Owner**: Daniel
**What**: Todos os endpoints financeiros obedecem contracts.md; autenticação, 422, 409 e sucesso cobertos.
**Where**: `src/app/api/finance/`
**Depends on**: T3, T5, T6, T7
**Requirement**: DATA-01, CASH-01, CASH-03, RES-01, SAFE-01, SAFE-05
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 8 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(caixa): adaptador http financeiro`

### T9: Catálogo seguro de ferramentas

**Owner**: Bruno
**What**: Ferramentas aceitam argumentos validados; não há transferência/envio externo; input ambíguo ou instrução importada não produz mutação.
**Where**: `src/features/agent/tools.ts`
**Depends on**: T1
**Requirement**: AGENT-01, AGENT-02, SAFE-04, SAFE-06
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 7 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate quick da tabela passa com evidência registrada; dependências concluídas.
**Tests**: unit
**Gate**: quick
**Commit**: `feat(agente): catálogo seguro de ferramentas`

### T10: Turno de conversa com contexto

**Owner**: Bruno
**What**: Responses API por adaptador; chamadas de ferramenta usam o contexto correto; falha externa não confirma sucesso nem duplica efeitos.
**Where**: `src/features/agent/turn.ts`
**Depends on**: T9
**Requirement**: AGENT-01, AGENT-02, PRO-01, VOICE-03, SAFE-04
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 7 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(agente): turno de conversa com contexto`

### T11: Avaliador de iniciativas

**Owner**: Bruno
**What**: F1 atrasada produz alerta numérico correto; rascunho usa fatos e máximo de três iniciativas respeita ordenação e desempate.
**Where**: `src/features/agent/proactivity.ts`
**Depends on**: T9
**Requirement**: PRO-01, PRO-02, PRO-03, PRO-04
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 7 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate quick da tabela passa com evidência registrada; dependências concluídas.
**Tests**: unit
**Gate**: quick
**Commit**: `feat(agente): avaliador de iniciativas`

### T12: Persistência e criação de tarefas

**Owner**: Bruno
**What**: Validar e persistir horário escolhido pelo agente, justificativa e prioridade do horário explícito do usuário; Criar, persistir, cancelar e adiar compromisso não duplica tarefa; preferências desativadas impedem nova criação.
**Where**: `src/features/tasks/schedule.ts`
**Depends on**: T1
**Requirement**: TASK-07, TASK-08, HOST-04, TASK-01, TASK-05, TASK-06
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 8 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(agente): persistência e criação de tarefas`

### T13: Executor de ocorrências

**Owner**: Bruno
**What**: Integrar despacho SQL condicional: zero HTTP/IA sem tarefa elegível, bloqueio temporário de despacho e recuperação após falha; Processar no máximo cinco ocorrências por tick, orçamento 30 s/maxDuration 60 s e persistência entre instâncias; Executor processa sem usuário, adquire ocorrência uma vez, relê pagamento antes de notificar e resiste a retry/falha/concorrência.
**Where**: `src/features/tasks/runner.ts`
**Depends on**: T11, T12
**Requirement**: HOST-05, HOST-02, HOST-04, TASK-02, TASK-03, TASK-04, TASK-06
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 12 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(agente): executor de ocorrências`

### T14: Adaptador HTTP do agente e tarefas

**Owner**: Bruno
**What**: Turno, feed e executor cumprem contratos; endpoint de tarefas em src/app/api/tasks é apenas adaptador do mesmo módulo; sem segredo válido não há processamento.
**Where**: `src/app/api/agent/`
**Depends on**: T10, T13
**Requirement**: SAFE-01, SAFE-03, SAFE-05, TASK-02, TASK-05, PRO-03
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 8 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(agente): adaptador http do agente e tarefas`

### T15: Painel de caixa

**Owner**: Jecky
**What**: Saldo atual, realizados, reservas e previsão exibem valores de mocks v1; tela vazia e erro não parecem saldo real.
**Where**: `src/features/experience/cash-panel.tsx`
**Depends on**: T1
**Requirement**: CASH-01, CASH-02, DATA-04
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 5 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate quick da tabela passa com evidência registrada; dependências concluídas.
**Tests**: unit
**Gate**: quick
**Commit**: `feat(experiencia): painel de caixa`

### T16: Experiência de importação

**Owner**: Jecky
**What**: Selecionar arquivo, informar saldo, conferir prévia e confirmar; erro por linha mantém prévia corrigível e bloqueia confirmação.
**Where**: `src/features/experience/import-panel.tsx`
**Depends on**: T1
**Requirement**: DATA-01, DATA-02, DATA-03
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 5 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate quick da tabela passa com evidência registrada; dependências concluídas.
**Tests**: unit
**Gate**: quick
**Commit**: `feat(experiencia): experiência de importação`

### T17: Comparação de cenários

**Owner**: Jecky
**What**: Exibir cenário base e hipótese F1, datas negativas e menor saldo; alterar previsão exige escolha distinta de simular.
**Where**: `src/features/experience/scenario-panel.tsx`
**Depends on**: T1
**Requirement**: CASH-03, CASH-04, CASH-05
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 5 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate quick da tabela passa com evidência registrada; dependências concluídas.
**Tests**: unit
**Gate**: quick
**Commit**: `feat(experiencia): comparação de cenários`

### T18: Conversa e decisões sobre propostas

**Owner**: Jecky
**What**: Mensagem, esclarecimento, aceite, ajuste e dispensa usam contratos; proposta stale não é aplicada; cobrança continua rascunho.
**Where**: `src/features/experience/conversation.tsx`
**Depends on**: T1
**Requirement**: AGENT-01, AGENT-02, RES-01, PRO-03
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 6 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate quick da tabela passa com evidência registrada; dependências concluídas.
**Tests**: unit
**Gate**: quick
**Commit**: `feat(experiencia): conversa e decisões sobre propostas`

### T19: Interação de voz por turnos

**Owner**: Jecky
**What**: Limitar gravação a 3 MiB/60 s e síntese a 1.200 caracteres/3 MiB, sem base64; Gravar/transcrever/editar/reproduzir com endpoints server-side em src/app/api/audio; sem permissão, limite, falha de IA e fallback textual cobertos na mesma entrega.
**Where**: `src/features/experience/voice.tsx`
**Depends on**: T18
**Requirement**: HOST-03, VOICE-01, VOICE-02, VOICE-03, SAFE-01
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 7 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: integration
**Gate**: full
**Commit**: `feat(experiencia): interação de voz por turnos`

### T20: Notificações e acompanhamento

**Owner**: Jecky
**What**: Ler iniciativa, adiar, cancelar e marcar resolvido; não duplica alerta e só apresenta três prioridades.
**Where**: `src/features/experience/inbox.tsx`
**Depends on**: T1
**Requirement**: TASK-03, TASK-04, TASK-05, PRO-04
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 6 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate quick da tabela passa com evidência registrada; dependências concluídas.
**Tests**: unit
**Gate**: quick
**Commit**: `feat(experiencia): notificações e acompanhamento`

### Phase 3: Integração e demonstração

### T21: Composição dos adaptadores reais

**Owner**: Jecky + Bruno + Daniel
**What**: Trocar mocks por adaptadores reais e provar jornadas CSV, atraso, reserva, voz e lembrete resolvido sem reescrever contratos.
**Where**: `src/app/page.tsx`
**Depends on**: T8, T14, T15, T16, T17, T18, T19, T20
**Requirement**: DATA-01, CASH-03, RES-03, TASK-03, VOICE-01
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 5 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate full da tabela passa com evidência registrada; dependências concluídas.
**Tests**: e2e
**Gate**: full
**Commit**: `feat(experiencia): composição dos adaptadores reais`

### T22: Agendamento real e ensaio de demonstração

**Owner**: Bruno + revisão dos três
**What**: Preparar um único Supabase Cron de cinco minutos com gate SQL antes do HTTP protegido para Vercel Hobby; provar zero HTTP com fila vazia ou apenas tarefas futuras; validar seis tarefas com limite de cinco por lote; testar processamento sem aba, notificação única, segredo inválido e F1 em até três minutos; ativação remota só após autorização.
**Where**: `supabase/migrations/003_schedule.sql`
**Depends on**: T21
**Requirement**: HOST-05, HOST-01, HOST-02, TASK-02, TASK-04, SAFE-03, CASH-03
**Reuses**: contracts.md e fixtures F1/F2; nenhuma aplicação preexistente.
**Tools**: terminal; skills tlc-spec-driven e karpathy-guidelines; OpenAI Docs para API, Playwright para E2E quando aplicável.
**Done when**:
- [ ] Resultado descrito em What observado e todos os critérios vinculados exercitados.
- [ ] Pelo menos 4 novos casos relevantes passam junto dos testes existentes; sem skip nem enfraquecimento.
- [ ] Gate build da tabela passa com evidência registrada; dependências concluídas.
**Tests**: e2e
**Gate**: build
**Commit**: `feat(tarefas): agendamento real e ensaio de demonstração`

## Task Granularity Check

Cada tarefa entrega um componente ou capacidade coesa. Testes co-localizados e adaptadores mínimos pertencem à mesma entrega, não a uma tarefa posterior. T1 é bootstrap transversal deliberado, revisado pelos três. Não entregar controllers sem testes até uma tarefa futura.

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | None | Match |
| T2 | T1 | T1 | Match |
| T3 | T2 | T2 | Match |
| T4 | T1 | T1 | Match |
| T5 | T2 | T2 | Match |
| T6 | T4 | T4 | Match |
| T7 | T4, T5 | T4, T5 | Match |
| T8 | T3, T5, T6, T7 | T3, T5, T6, T7 | Match |
| T9 | T1 | T1 | Match |
| T10 | T9 | T9 | Match |
| T11 | T9 | T9 | Match |
| T12 | T1 | T1 | Match |
| T13 | T11, T12 | T11, T12 | Match |
| T14 | T10, T13 | T10, T13 | Match |
| T15 | T1 | T1 | Match |
| T16 | T1 | T1 | Match |
| T17 | T1 | T1 | Match |
| T18 | T1 | T1 | Match |
| T19 | T18 | T18 | Match |
| T20 | T1 | T1 | Match |
| T21 | T8, T14, T15, T16, T17, T18, T19, T20 | T8, T14, T15, T16, T17, T18, T19, T20 | Match |
| T22 | T21 | T21 | Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Infra/API/persistência | integration | integration | OK |
| T2 | Infra/API/persistência | integration | integration | OK |
| T3 | Infra/API/persistência | integration | integration | OK |
| T4 | Módulo/componente | unit | unit | OK |
| T5 | Infra/API/persistência | integration | integration | OK |
| T6 | Módulo/componente | unit | unit | OK |
| T7 | Infra/API/persistência | integration | integration | OK |
| T8 | Infra/API/persistência | integration | integration | OK |
| T9 | Módulo/componente | unit | unit | OK |
| T10 | Infra/API/persistência | integration | integration | OK |
| T11 | Módulo/componente | unit | unit | OK |
| T12 | Infra/API/persistência | integration | integration | OK |
| T13 | Infra/API/persistência | integration | integration | OK |
| T14 | Infra/API/persistência | integration | integration | OK |
| T15 | Módulo/componente | unit | unit | OK |
| T16 | Módulo/componente | unit | unit | OK |
| T17 | Módulo/componente | unit | unit | OK |
| T18 | Módulo/componente | unit | unit | OK |
| T19 | Infra/API/persistência | integration | integration | OK |
| T20 | Módulo/componente | unit | unit | OK |
| T21 | Composição/jornada | e2e | e2e | OK |
| T22 | Composição/jornada | e2e | e2e | OK |

## Deferred

STOCK-01 e STOCK-02 são P2, não bloqueiam as três cadeias do MVP. Não começar estoque enquanto CSV, simulação e os dois fluxos não estiverem integrados.

## Approval boundary

Antes de Execute, confirmar stack, comandos, defaults e ownership. Branches ainda não criadas. Publicação, push, provisionamento e ativação de cron remoto não estão autorizados por esta documentação.

## Restrições adicionais de implantação

Os requisitos HOST-01 a HOST-04 são P1 e têm testes nas tarefas indicadas. T19 testa fronteiras de tamanho/duração; T13 testa seis pendências com apenas cinco aquisições, próxima execução e restart; T22 verifica ausência de cron frequente Vercel. Tudo segue docs/deploy-gratuito.md. Os contadores mínimos de testes originais são pisos; novos casos são adicionais quando não cobertos. Cron real, variáveis remotas e deploy só são ativados após autorização. Não há garantia de preview automático para todas as branches no Hobby.

## Decisão de agendamento aceita

Agente determina due_at e motivo ao criar tarefa; usuário pode substituir o horário. Cron só checa elegibilidade no banco e não chama Vercel/IA sem trabalho. TASK-07/TASK-08 mapeiam T1/T12; HOST-05 mapeia T13/T22. Não aumentar a quantidade de jobs com um cron por compromisso. Ver docs/deploy-gratuito.md.
